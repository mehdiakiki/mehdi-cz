use rust_backend_labs::{database, discard};
use serde_json::Value;
use sqlx::{postgres::PgPoolOptions, types::Json, Acquire, PgConnection, PgPool};
use std::time::Duration;
use tokio::{sync::oneshot, time::timeout};

type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

fn ci_only() {
    assert_eq!(std::env::var("GITHUB_ACTIONS").as_deref(), Ok("true"));
    assert_eq!(std::env::var("SQL_RUST_DISPOSABLE").as_deref(), Ok("1"));
}

fn sqlstate(error: &sqlx::Error) -> Option<String> {
    error
        .as_database_error()?
        .code()
        .map(|value| value.into_owned())
}

// article:start ordered-query
const ORDERS: &str = "SELECT id FROM limit_plan_review.orders
    WHERE tenant_id = $1 AND status = 'unpaid'
    ORDER BY created_at DESC, id DESC LIMIT 5";
// article:end ordered-query

// article:start capture-plan
async fn order_plan(connection: &mut PgConnection, tenant: &str) -> Result<Value> {
    let explain = format!("EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, FORMAT JSON) {ORDERS}");
    let Json(plan): Json<Value> = sqlx::query_scalar(&explain)
        .bind(tenant)
        .fetch_one(connection)
        .await?;
    Ok(plan)
}
// article:end capture-plan

fn plan_nodes<'a>(node: &'a Value, output: &mut Vec<&'a Value>) {
    output.push(node);
    if let Some(children) = node["Plans"].as_array() {
        for child in children {
            plan_nodes(child, output);
        }
    }
}

#[tokio::test]
async fn a_small_limit_does_not_bound_the_input_to_a_sort() -> Result<()> {
    ci_only();
    timeout(Duration::from_secs(30), async {
        let pool = database("limit_plan_review").await;
        sqlx::raw_sql(
            "CREATE TABLE orders(
                id integer PRIMARY KEY, tenant_id text NOT NULL,
                status text NOT NULL, created_at timestamptz NOT NULL);
             INSERT INTO orders
                SELECT n, CASE WHEN n % 20 = 0 THEN 'beta' ELSE 'alpha' END,
                       'unpaid', to_timestamp(n)
                FROM generate_series(1, 20000) AS n;
             CREATE INDEX orders_tenant_status_idx ON orders(tenant_id, status);
             ANALYZE orders",
        )
        .execute(&pool)
        .await?;
        let mut tx = pool.begin().await?;
        sqlx::query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
            .execute(&mut *tx)
            .await?;
        sqlx::query("SET LOCAL statement_timeout = '10s'")
            .execute(&mut *tx)
            .await?;
        let before = order_plan(&mut tx, "alpha").await?;
        println!("LIMIT_BEFORE {}", serde_json::to_string(&before)?);
        let before_rows: Vec<i32> = sqlx::query_scalar(ORDERS)
            .bind("alpha")
            .fetch_all(&mut *tx)
            .await?;
        let expected = vec![19999, 19998, 19997, 19996, 19995];
        assert_eq!(before_rows, expected);
        let mut before_nodes = Vec::new();
        plan_nodes(&before[0]["Plan"], &mut before_nodes);
        let scan = before_nodes.iter().find(|node| node["Node Type"] == "Seq Scan")
            .expect("the baseline must actually use a sequential scan");
        assert_eq!(scan["Actual Rows"].as_f64(), Some(19000.0));
        assert_eq!(scan["Rows Removed by Filter"].as_f64(), Some(1000.0));
        assert_eq!(scan["Actual Loops"].as_f64(), Some(1.0));
        assert!(before_nodes.iter().any(|node| node["Node Type"] == "Sort"));
        assert_eq!(before[0]["Plan"]["Actual Rows"].as_f64(), Some(5.0));

        // article:start ordered-index
        sqlx::query(
            "CREATE INDEX orders_tenant_status_created_idx
             ON limit_plan_review.orders
                (tenant_id, status, created_at DESC, id DESC)",
        )
        .execute(&mut *tx)
        .await?;
        // article:end ordered-index

        let after = order_plan(&mut tx, "alpha").await?;
        println!("LIMIT_AFTER {}", serde_json::to_string(&after)?);
        let after_rows: Vec<i32> = sqlx::query_scalar(ORDERS)
            .bind("alpha")
            .fetch_all(&mut *tx)
            .await?;
        assert_eq!(after_rows, expected);
        let mut after_nodes = Vec::new();
        plan_nodes(&after[0]["Plan"], &mut after_nodes);
        let scan = after_nodes.iter().find(|node| {
            node["Index Name"] == "orders_tenant_status_created_idx"
        }).expect("the repair must actually use the ordered index");
        assert_eq!(scan["Actual Rows"].as_f64(), Some(5.0));
        assert_eq!(scan["Actual Loops"].as_f64(), Some(1.0));
        assert!(!after_nodes.iter().any(|node| node["Node Type"] == "Sort"));
        println!("LIMIT: same five IDs; baseline scanned 19000 eligible plus 1000 filtered rows; ordered index emitted five without Sort");
        tx.rollback().await?;
        discard(pool, "limit_plan_review").await;
        Ok::<_, Box<dyn std::error::Error + Send + Sync>>(())
    }).await??;
    Ok(())
}

async fn session_state(connection: &mut PgConnection) -> Result<(i32, String)> {
    Ok(
        sqlx::query_as("SELECT pg_backend_pid(), current_setting('statement_timeout')")
            .fetch_one(connection)
            .await?,
    )
}

#[tokio::test]
async fn a_pool_checkout_is_not_a_new_postgresql_session() -> Result<()> {
    ci_only();
    timeout(Duration::from_secs(30), async {
        let admin = database("timeout_scope_review").await;
        let pool = PgPoolOptions::new()
            .max_connections(1)
            .acquire_timeout(Duration::from_secs(3))
            .connect_with((*admin.connect_options()).clone())
            .await?;
        let mut first = pool.acquire().await?;
        sqlx::query("SET statement_timeout = 0").execute(&mut *first).await?;
        let (pid, _) = session_state(&mut first).await?;
        sqlx::query("SET statement_timeout = '40ms'").execute(&mut *first).await?;
        drop(first);
        let mut next = pool.acquire().await?;
        assert_eq!(session_state(&mut next).await?, (pid, "40ms".into()));
        let error = sqlx::query("SELECT pg_sleep(0.15)").execute(&mut *next).await.unwrap_err();
        assert_eq!(sqlstate(&error).as_deref(), Some("57014"));
        sqlx::query("SET statement_timeout = 0").execute(&mut *next).await?;

        // Committing a transaction does not make SET session-local to that request.
        let mut tx = next.begin().await?;
        sqlx::query("SET statement_timeout = '40ms'").execute(&mut *tx).await?;
        tx.commit().await?;
        drop(next);
        let mut next = pool.acquire().await?;
        assert_eq!(session_state(&mut next).await?, (pid, "40ms".into()));
        sqlx::query("SET statement_timeout = 0").execute(&mut *next).await?;

        // article:start scoped-timeout
        let mut tx = next.begin().await?;
        sqlx::query("SET LOCAL statement_timeout = '40ms'")
            .execute(&mut *tx)
            .await?;
        sqlx::query("SELECT 1").execute(&mut *tx).await?;
        tx.commit().await?;
        // article:end scoped-timeout
        drop(next);
        let mut next = pool.acquire().await?;
        assert_eq!(session_state(&mut next).await?, (pid, "0".into()));
        sqlx::query("SELECT pg_sleep(0.15)").execute(&mut *next).await?;

        let mut tx = next.begin().await?;
        sqlx::query("SET LOCAL statement_timeout = '40ms'").execute(&mut *tx).await?;
        let error = sqlx::query("SELECT pg_sleep(0.15)").execute(&mut *tx).await.unwrap_err();
        assert_eq!(sqlstate(&error).as_deref(), Some("57014"));
        let aborted = sqlx::query("SELECT 1").execute(&mut *tx).await.unwrap_err();
        assert_eq!(sqlstate(&aborted).as_deref(), Some("25P02"));
        tx.rollback().await?;
        drop(next);
        let mut next = pool.acquire().await?;
        assert_eq!(session_state(&mut next).await?, (pid, "0".into()));
        sqlx::query("SELECT pg_sleep(0.15)").execute(&mut *next).await?;
        drop(next);

        let task_pool = pool.clone();
        let (ready_tx, ready_rx) = oneshot::channel();
        let task = tokio::spawn(async move {
            let mut tx = task_pool.begin().await.unwrap();
            sqlx::query("SET LOCAL statement_timeout = '40ms'").execute(&mut *tx).await.unwrap();
            ready_tx.send(session_state(&mut tx).await.unwrap()).unwrap();
            std::future::pending::<()>().await;
            tx.rollback().await.unwrap();
        });
        assert_eq!(ready_rx.await?, (pid, "40ms".into()));
        task.abort();
        assert!(task.await.unwrap_err().is_cancelled());
        let mut next = pool.acquire().await?;
        assert_eq!(session_state(&mut next).await?, (pid, "0".into()));
        sqlx::query("SELECT pg_sleep(0.15)").execute(&mut *next).await?;
        drop(next);
        println!("SESSION: same backend across borrowers; SET survived checkout and transaction commit; SET LOCAL restored 0 after commit, timeout/rollback and joined task cancellation");
        pool.close().await;
        discard(admin, "timeout_scope_review").await;
        Ok::<_, Box<dyn std::error::Error + Send + Sync>>(())
    }).await??;
    Ok(())
}

struct Principal {
    tenant: &'static str,
    user: &'static str,
}

struct CachedAnswer {
    tenant: &'static str,
    user: &'static str,
    contract: i32,
    sources: Vec<(i64, i64)>,
    text: String,
}

#[derive(Debug, PartialEq, Eq)]
enum CacheUse {
    Hit(String),
    Miss,
    Denied,
}

// article:start reuse-answer
async fn reuse_answer(
    pool: &PgPool,
    principal: &Principal,
    contract: i32,
    cached: &CachedAnswer,
) -> Result<CacheUse> {
    if (cached.tenant, cached.user, cached.contract) != (principal.tenant, principal.user, contract)
        || cached.sources.is_empty()
    {
        return Ok(CacheUse::Miss);
    }
    let mut tx = pool.begin().await?;
    sqlx::query("SET TRANSACTION READ ONLY")
        .execute(&mut *tx)
        .await?;
    sqlx::query(
        "SELECT set_config('app.tenant_id', $1, true),
                set_config('app.principal_id', $2, true)",
    )
    .bind(principal.tenant)
    .bind(principal.user)
    .execute(&mut *tx)
    .await?;
    let ids: Vec<i64> = cached.sources.iter().map(|(id, _)| *id).collect();
    let visible: Vec<(i64, i64)> = sqlx::query_as(
        "SELECT id, revision FROM cache_source_review.documents
         WHERE id = ANY($1) ORDER BY id",
    )
    .bind(&ids)
    .fetch_all(&mut *tx)
    .await?;
    tx.commit().await?;
    if visible.len() != cached.sources.len() {
        return Ok(CacheUse::Denied);
    }
    if visible != cached.sources {
        return Ok(CacheUse::Miss);
    }
    Ok(CacheUse::Hit(cached.text.clone()))
}
// article:end reuse-answer

async fn visible_source(pool: &PgPool) -> Result<(i64, i64, String)> {
    let mut tx = pool.begin().await?;
    sqlx::query("SELECT set_config('app.tenant_id','alpha',true), set_config('app.principal_id','alice',true)")
        .execute(&mut *tx).await?;
    let row =
        sqlx::query_as("SELECT id, revision, body FROM cache_source_review.documents WHERE id=1")
            .fetch_one(&mut *tx)
            .await?;
    tx.commit().await?;
    Ok(row)
}

#[tokio::test]
async fn a_warm_answer_needs_current_access_and_source_versions() -> Result<()> {
    ci_only();
    timeout(Duration::from_secs(30), async {
        let admin = database("cache_source_review").await;
        sqlx::raw_sql(
            "CREATE ROLE cache_source_reader LOGIN PASSWORD 'disposable-cache-only'
                NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
             CREATE SEQUENCE document_revision;
             CREATE TABLE documents(
                tenant_id text NOT NULL, id bigint NOT NULL, body text NOT NULL,
                revision bigint NOT NULL,
                PRIMARY KEY(tenant_id,id));
             CREATE FUNCTION advance_revision() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                    NEW.revision := nextval('cache_source_review.document_revision');
                    RETURN NEW;
                END $$;
             CREATE TRIGGER document_changed BEFORE INSERT OR UPDATE ON documents
                FOR EACH ROW EXECUTE FUNCTION advance_revision();
             CREATE TABLE access_grants(
                tenant_id text NOT NULL, principal text NOT NULL, document_id bigint NOT NULL,
                PRIMARY KEY(tenant_id,principal,document_id),
                FOREIGN KEY(tenant_id,document_id) REFERENCES documents(tenant_id,id) ON DELETE CASCADE);
             INSERT INTO documents(tenant_id,id,body) VALUES
                ('alpha',1,'old source'), ('alpha',2,'another user source'), ('beta',1,'foreign source');
             INSERT INTO access_grants VALUES ('alpha','alice',1),('alpha','bob',2),('beta','carol',1);
             ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
             ALTER TABLE access_grants ENABLE ROW LEVEL SECURITY;
             CREATE POLICY own_grants ON access_grants TO cache_source_reader USING (
                tenant_id=current_setting('app.tenant_id',true)
                AND principal=current_setting('app.principal_id',true));
             CREATE POLICY visible_documents ON documents TO cache_source_reader USING (
                tenant_id=current_setting('app.tenant_id',true) AND EXISTS (
                    SELECT 1 FROM cache_source_review.access_grants AS g
                    WHERE g.tenant_id=documents.tenant_id AND g.document_id=documents.id
                      AND g.principal=current_setting('app.principal_id',true)));
             GRANT USAGE ON SCHEMA cache_source_review TO cache_source_reader;
             GRANT SELECT ON documents,access_grants TO cache_source_reader",
        ).execute(&admin).await?;
        let reader = PgPoolOptions::new().max_connections(1)
            .connect_with((*admin.connect_options()).clone()
                .username("cache_source_reader").password("disposable-cache-only"))
            .await?;
        let principal = Principal { tenant: "alpha", user: "alice" };
        let (id, revision, body) = visible_source(&reader).await?;
        let mut cached = CachedAnswer {
            tenant: "alpha", user: "alice", contract: 7,
            sources: vec![(id, revision)], text: format!("answer based on {body}"),
        };
        assert_eq!(reuse_answer(&reader, &principal, 7, &cached).await?, CacheUse::Hit(cached.text.clone()));
        assert_eq!(reuse_answer(&reader, &principal, 8, &cached).await?, CacheUse::Miss);
        let other = Principal { tenant: "beta", user: "carol" };
        assert_eq!(reuse_answer(&reader, &other, 7, &cached).await?, CacheUse::Miss);
        let other_user = Principal { tenant: "alpha", user: "bob" };
        assert_eq!(reuse_answer(&reader, &other_user, 7, &cached).await?, CacheUse::Miss);
        let forbidden_source = CachedAnswer {
            tenant: "alpha", user: "alice", contract: 7,
            sources: vec![(2, 0)], text: "another user's source".into(),
        };
        assert_eq!(reuse_answer(&reader, &principal, 7, &forbidden_source).await?, CacheUse::Denied);

        // A matching in-memory key still has the old answer after a source edit.
        let unchecked_hit = cached.text.clone();
        sqlx::query("UPDATE documents SET body='corrected source' WHERE tenant_id='alpha' AND id=1")
            .execute(&admin).await?;
        assert_eq!(cached.text, unchecked_hit);
        assert_eq!(reuse_answer(&reader, &principal, 7, &cached).await?, CacheUse::Miss);
        let (id, new_revision, body) = visible_source(&reader).await?;
        assert_ne!(revision, new_revision);
        cached.sources = vec![(id, new_revision)];
        cached.text = format!("answer based on {body}");
        assert_eq!(reuse_answer(&reader, &principal, 7, &cached).await?, CacheUse::Hit(cached.text.clone()));

        sqlx::query("DELETE FROM access_grants WHERE tenant_id='alpha' AND principal='alice'")
            .execute(&admin).await?;
        // The cache bytes remain present, even though the database now denies reuse.
        assert_eq!(cached.text, "answer based on corrected source");
        assert_eq!(reuse_answer(&reader, &principal, 7, &cached).await?, CacheUse::Denied);
        sqlx::query("INSERT INTO access_grants VALUES ('alpha','alice',1)").execute(&admin).await?;
        assert_eq!(reuse_answer(&reader, &principal, 7, &cached).await?, CacheUse::Hit(cached.text.clone()));
        sqlx::query("DELETE FROM documents WHERE tenant_id='alpha' AND id=1").execute(&admin).await?;
        assert_eq!(reuse_answer(&reader, &principal, 7, &cached).await?, CacheUse::Denied);
        sqlx::query("INSERT INTO documents(tenant_id,id,body,revision) VALUES ('alpha',1,'replacement source',$1)")
            .bind(new_revision).execute(&admin).await?;
        sqlx::query("INSERT INTO access_grants VALUES ('alpha','alice',1)").execute(&admin).await?;
        assert_eq!(reuse_answer(&reader, &principal, 7, &cached).await?, CacheUse::Miss);
        let (_, replacement_revision, _) = visible_source(&reader).await?;
        assert_ne!(replacement_revision, new_revision);
        println!("CACHE: warm hit; contract/tenant mismatch missed; database-owned revision changed after edit; revoked and deleted sources denied; reinserted ID missed despite restored access");
        reader.close().await;
        sqlx::raw_sql("DROP SCHEMA cache_source_review CASCADE; DROP ROLE cache_source_reader")
            .execute(&admin).await?;
        admin.close().await;
        Ok::<_, Box<dyn std::error::Error + Send + Sync>>(())
    }).await??;
    Ok(())
}
