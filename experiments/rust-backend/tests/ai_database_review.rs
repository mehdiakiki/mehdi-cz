use rust_backend_labs::{database, discard};
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::time::Duration;
use tokio::{sync::oneshot, time::timeout};

type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct InvoicePage {
    after_id: i64,
    limit: i64,
}

// Constructed by the authenticated host, outside the model's tool arguments.
struct Principal {
    tenant: &'static str,
}

// article:start bounded-tool
async fn list_invoices(
    pool: &PgPool,
    principal: &Principal,
    input: InvoicePage,
) -> Result<Vec<(i64, String, String)>> {
    if !(1..=10).contains(&input.limit) || input.after_id < 0 {
        return Err("invalid page boundary".into());
    }
    let mut tx = pool.begin().await?;
    sqlx::query("SET TRANSACTION READ ONLY")
        .execute(&mut *tx)
        .await?;
    sqlx::query(
        "SELECT set_config('app.tenant_id', $1, true),
                set_config('statement_timeout', '250ms', true)",
    )
    .bind(principal.tenant)
    .execute(&mut *tx)
    .await?;
    let rows = sqlx::query_as(
        "SELECT id, left(title, 64), left(summary, 128)
         FROM ai_tool_review.invoices
         WHERE tenant_id = $1 AND id > $2
         ORDER BY id LIMIT $3",
    )
    .bind(principal.tenant)
    .bind(input.after_id)
    .bind(input.limit)
    .fetch_all(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(rows)
}
// article:end bounded-tool

#[tokio::test]
async fn a_read_only_tool_needs_identity_time_and_output_boundaries() -> Result<()> {
    assert_eq!(std::env::var("GITHUB_ACTIONS").as_deref(), Ok("true"));
    timeout(Duration::from_secs(20), async {
        let admin = database("ai_tool_review").await;
        sqlx::raw_sql(
            "CREATE ROLE ai_tool_review_reader LOGIN PASSWORD 'disposable-tool-only'
                 NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
             CREATE TABLE invoices(
                 tenant_id text NOT NULL, id bigint NOT NULL,
                 title text NOT NULL, summary text NOT NULL,
                 PRIMARY KEY(tenant_id, id));
             INSERT INTO invoices VALUES
                 ('alpha', 1, 'alpha invoice', repeat('a', 10000)),
                 ('beta', 1, 'beta invoice', repeat('b', 10000));
             INSERT INTO invoices
                 SELECT 'alpha', n, repeat('界', 300), repeat('界', 10000)
                 FROM generate_series(2, 20) AS n;
             INSERT INTO invoices
                 SELECT 'alpha', n, repeat(chr(1), 300), repeat(chr(1), 10000)
                 FROM generate_series(21, 30) AS n;
             ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
             CREATE POLICY invoice_tenant ON invoices TO ai_tool_review_reader
                 USING (tenant_id = current_setting('app.tenant_id', true));
             GRANT USAGE ON SCHEMA ai_tool_review TO ai_tool_review_reader;
             GRANT SELECT ON invoices TO ai_tool_review_reader",
        )
        .execute(&admin)
        .await?;
        let options = (*admin.connect_options())
            .clone()
            .username("ai_tool_review_reader")
            .password("disposable-tool-only");
        let reader = PgPoolOptions::new()
            .max_connections(1)
            .connect_with(options)
            .await?;

        // The role cannot gain write permission by disabling a read-only default.
        sqlx::query("SET default_transaction_read_only = off")
            .execute(&reader)
            .await?;
        let denied = sqlx::query("UPDATE ai_tool_review.invoices SET title = 'changed'")
            .execute(&reader)
            .await
            .unwrap_err();
        assert_eq!(denied.as_database_error().unwrap().code().as_deref(), Some("42501"));
        assert!(serde_json::from_value::<InvoicePage>(serde_json::json!({
            "after_id": 0, "limit": 10, "tenant": "beta"
        }))
        .is_err());
        let alpha = list_invoices(
            &reader,
            &Principal { tenant: "alpha" },
            InvoicePage { after_id: 0, limit: 10 },
        )
        .await?;
        assert_eq!(alpha.len(), 10);
        assert_eq!(alpha[0].1, "alpha invoice");
        assert!(alpha.iter().all(|row| row.1 != "beta invoice"));
        let encoded = serde_json::to_vec(&alpha)?;
        assert!(encoded.len() < 16 * 1024);
        let escaped = list_invoices(
            &reader,
            &Principal { tenant: "alpha" },
            InvoicePage { after_id: 20, limit: 10 },
        )
        .await?;
        assert_eq!(escaped.len(), 10);
        let escaped_bytes = serde_json::to_vec(&escaped)?;
        assert!(escaped_bytes.len() < 16 * 1024);
        let beta = list_invoices(
            &reader,
            &Principal { tenant: "beta" },
            InvoicePage { after_id: 0, limit: 10 },
        )
        .await?;
        assert_eq!(beta.len(), 1);
        assert_eq!(beta[0].1, "beta invoice");
        assert!(list_invoices(
            &reader,
            &Principal { tenant: "alpha" },
            InvoicePage { after_id: 0, limit: 11 },
        )
        .await
        .is_err());

        // Without a request identity, row security exposes neither tenant.
        let visible: i64 = sqlx::query_scalar("SELECT count(*) FROM ai_tool_review.invoices")
            .fetch_one(&reader)
            .await?;
        assert_eq!(visible, 0);
        let mut policy = reader.begin().await?;
        sqlx::query("SELECT set_config('app.tenant_id', 'alpha', true)")
            .execute(&mut *policy).await?;
        let foreign: i64 = sqlx::query_scalar(
            "SELECT count(*) FROM ai_tool_review.invoices WHERE tenant_id = 'beta'",
        ).fetch_one(&mut *policy).await?;
        assert_eq!(foreign, 0, "row security rejects a conflicting SQL predicate");
        policy.rollback().await?;
        let mut tx = reader.begin().await?;
        sqlx::raw_sql("SET TRANSACTION READ ONLY; SET LOCAL statement_timeout = '250ms';
                       SELECT set_config('app.tenant_id', 'alpha', true)")
            .execute(&mut *tx)
            .await?;
        let cancelled = sqlx::query("SELECT pg_sleep(2)")
            .execute(&mut *tx)
            .await
            .unwrap_err();
        assert_eq!(cancelled.as_database_error().unwrap().code().as_deref(), Some("57014"));
        tx.rollback().await?;
        assert_eq!(
            sqlx::query_scalar::<_, i32>("SELECT 42").fetch_one(&reader).await?,
            42
        );
        // Arrange cancellation after identity setup, while the transaction is open.
        let (entered, observed) = oneshot::channel();
        let interrupted_pool = reader.clone();
        let interrupted = tokio::spawn(async move {
            let mut tx = interrupted_pool.begin().await?;
            sqlx::query("SELECT set_config('app.tenant_id', 'alpha', true)")
                .execute(&mut *tx).await?;
            entered.send(()).unwrap();
            std::future::pending::<()>().await;
            tx.commit().await?;
            Ok::<_, sqlx::Error>(())
        });
        observed.await?;
        interrupted.abort();
        assert!(interrupted.await.unwrap_err().is_cancelled());
        let beta_after_abort = list_invoices(
            &reader,
            &Principal { tenant: "beta" },
            InvoicePage { after_id: 0, limit: 10 },
        ).await?;
        assert_eq!(beta_after_abort.len(), 1);
        assert_eq!(beta_after_abort[0].1, "beta invoice");
        let unset: i64 = sqlx::query_scalar("SELECT count(*) FROM ai_tool_review.invoices")
            .fetch_one(&reader).await?;
        assert_eq!(unset, 0, "neither failed nor aborted work leaves a tenant setting");
        println!("Tool cleanup: conflicting tenant predicate rejected; aborted task dropped an open alpha transaction; next beta call stayed isolated and the pooled session had no tenant afterward.");
        println!("Tool boundary: UPDATE rejected with 42501; tenant argument rejected; alpha/beta stayed separate on one pooled session; Unicode page={} bytes, escaped-control page={} bytes; read-only pg_sleep cancelled with 57014; connection recovered.", encoded.len(), escaped_bytes.len());
        reader.close().await;
        discard(admin, "ai_tool_review").await;
        let cleanup = PgPool::connect(&std::env::var("SQL_RUST_PG_URL")?).await?;
        sqlx::query("DROP ROLE ai_tool_review_reader").execute(&cleanup).await?;
        cleanup.close().await;
        Ok::<_, Box<dyn std::error::Error + Send + Sync>>(())
    })
    .await?
}

#[tokio::test]
async fn type_compatible_migration_can_still_wait_for_a_reader() -> Result<()> {
    assert_eq!(std::env::var("GITHUB_ACTIONS").as_deref(), Ok("true"));
    timeout(Duration::from_secs(20), async {
        let pool = database("ai_migration_review").await;
        let observer = PgPoolOptions::new().max_connections(1)
            .connect(&std::env::var("SQL_RUST_PG_URL")?).await?;
        sqlx::raw_sql("CREATE TABLE items(id integer PRIMARY KEY); INSERT INTO items VALUES (7)")
            .execute(&pool)
            .await?;
        let mut old = pool.begin().await?;
        let holder: i32 = sqlx::query_scalar("SELECT pg_backend_pid()")
            .fetch_one(&mut *old)
            .await?;
        assert_eq!(sqlx::query_scalar::<_, i32>("SELECT id FROM items")
            .fetch_one(&mut *old).await?, 7);
        let mut ddl = pool.acquire().await?;
        sqlx::raw_sql("SET lock_timeout = '5s'; SET statement_timeout = '8s'")
            .execute(&mut *ddl).await?;
        let waiter: i32 = sqlx::query_scalar("SELECT pg_backend_pid()")
            .fetch_one(&mut *ddl).await?;
        let migration = tokio::spawn(async move {
            sqlx::query("ALTER TABLE items ADD COLUMN note text")
                .execute(&mut *ddl).await
        });
        timeout(Duration::from_secs(1), async {
            loop {
                let blockers: Vec<i32> = sqlx::query_scalar("SELECT pg_blocking_pids($1)")
                    .bind(waiter).fetch_one(&observer).await?;
                if blockers.contains(&holder) { break Ok::<_, sqlx::Error>(()); }
                tokio::time::sleep(Duration::from_millis(10)).await;
            }
        }).await??;
        // A later ordinary read queues behind the waiting DDL request.
        let mut later = pool.acquire().await?;
        let later_pid: i32 = sqlx::query_scalar("SELECT pg_backend_pid()")
            .fetch_one(&mut *later).await?;
        let read = tokio::spawn(async move {
            sqlx::query_scalar::<_, i32>("SELECT id FROM items")
                .fetch_one(&mut *later).await
        });
        timeout(Duration::from_secs(1), async {
            loop {
                let blockers: Vec<i32> = sqlx::query_scalar("SELECT pg_blocking_pids($1)")
                    .bind(later_pid).fetch_one(&observer).await?;
                if blockers.contains(&waiter) { break Ok::<_, sqlx::Error>(()); }
                tokio::time::sleep(Duration::from_millis(10)).await;
            }
        }).await??;
        let failure = migration.await?.unwrap_err();
        assert_eq!(failure.as_database_error().unwrap().code().as_deref(), Some("55P03"));
        assert_eq!(timeout(Duration::from_secs(2), read).await???, 7);
        // The original reader is still open: removing the queued DDL restored reads.
        let columns: i64 = sqlx::query_scalar(
            "SELECT count(*) FROM information_schema.columns
             WHERE table_schema = 'ai_migration_review' AND table_name = 'items'
             AND column_name = 'note'",
        ).fetch_one(&pool).await?;
        assert_eq!(columns, 0);
        old.rollback().await?;
        // article:start migration-budget
        let mut tx = pool.begin().await?;
        sqlx::raw_sql("SET LOCAL lock_timeout = '2s'; SET LOCAL statement_timeout = '5s'")
            .execute(&mut *tx)
            .await?;
        sqlx::query("ALTER TABLE items ADD COLUMN note text")
            .execute(&mut *tx)
            .await?;
        tx.commit().await?;
        // article:end migration-budget
        let row: (i32, Option<String>) = sqlx::query_as("SELECT id, note FROM items")
            .fetch_one(&pool).await?;
        assert_eq!(row, (7, None));
        println!("Migration boundary: old reader blocked DDL; waiting DDL blocked a later SELECT; both exact blocker PIDs observed. DDL failed with 55P03 and no column; later SELECT returned 7 while old reader remained open. After reader rollback the bounded migration succeeded.");
        observer.close().await;
        discard(pool, "ai_migration_review").await;
        Ok::<_, Box<dyn std::error::Error + Send + Sync>>(())
    }).await?
}

#[tokio::test]
async fn filtered_hnsw_results_need_an_authorized_exact_reference() -> Result<()> {
    assert_eq!(std::env::var("GITHUB_ACTIONS").as_deref(), Ok("true"));
    timeout(Duration::from_secs(45), async {
        let pool = database("ai_vector_review").await;
        sqlx::query("CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public")
            .execute(&pool).await?;
        let mut tx = pool.begin().await?;
        sqlx::query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
            .execute(&mut *tx).await?;
        let isolation: String = sqlx::query_scalar("SHOW transaction_isolation")
            .fetch_one(&mut *tx).await?;
        assert_eq!(isolation, "repeatable read");
        sqlx::raw_sql(
            "SET LOCAL search_path = ai_vector_review, public;
             CREATE TABLE documents(id integer PRIMARY KEY, tenant_id text NOT NULL, embedding vector(3) NOT NULL);
             INSERT INTO documents
                SELECT n, CASE WHEN n <= 1000 THEN 'beta' ELSE 'alpha' END,
                    ('[' || (n::float8 / 1000)::text || ',0,0]')::vector
                FROM generate_series(1, 1024) AS n;
             CREATE INDEX document_neighbors ON documents USING hnsw(embedding vector_l2_ops);
             ANALYZE documents;
             SET LOCAL enable_indexscan = off;
             SET LOCAL enable_bitmapscan = off",
        ).execute(&mut *tx).await?;
        let exact: Vec<i32> = sqlx::query_scalar(
            "SELECT id FROM documents WHERE tenant_id = $1
             ORDER BY embedding <-> '[0,0,0]'::vector LIMIT 5",
        ).bind("alpha").fetch_all(&mut *tx).await?;
        assert_eq!(exact, [1001, 1002, 1003, 1004, 1005]);
        let exact_plan: Vec<String> = sqlx::query_scalar(
            "EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
             SELECT id FROM documents WHERE tenant_id = $1
             ORDER BY embedding <-> '[0,0,0]'::vector LIMIT 5",
        ).bind("alpha").fetch_all(&mut *tx).await?;
        assert!(exact_plan.iter().any(|line| line.contains("Seq Scan on documents")));
        assert!(!exact_plan.iter().any(|line| line.contains("document_neighbors")));
        sqlx::raw_sql(
            "SET LOCAL enable_indexscan = on; SET LOCAL enable_seqscan = off;
             SET LOCAL hnsw.ef_search = 10; SET LOCAL hnsw.iterative_scan = off",
        ).execute(&mut *tx).await?;
        let plan: Vec<String> = sqlx::query_scalar(
            "EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
             SELECT id FROM documents WHERE tenant_id = $1
             ORDER BY embedding <-> '[0,0,0]'::vector LIMIT 5",
        ).bind("alpha").fetch_all(&mut *tx).await?;
        assert!(plan.iter().any(|line| line.contains("Index Scan using document_neighbors")));
        let limited: Vec<i32> = sqlx::query_scalar(
            "SELECT id FROM documents WHERE tenant_id = $1
             ORDER BY embedding <-> '[0,0,0]'::vector LIMIT 5",
        ).bind("alpha").fetch_all(&mut *tx).await?;
        assert!(limited.len() < exact.len(), "counterexample needs missing eligible rows");
        // article:start iterative-search
        sqlx::raw_sql(
            "SET LOCAL hnsw.iterative_scan = strict_order;
             SET LOCAL hnsw.max_scan_tuples = 20000",
        )
        .execute(&mut *tx)
        .await?;
        let recovered: Vec<i32> = sqlx::query_scalar(
            "SELECT id FROM documents WHERE tenant_id = $1
             ORDER BY embedding <-> '[0,0,0]'::vector LIMIT 5",
        )
        .bind("alpha")
        .fetch_all(&mut *tx)
        .await?;
        // article:end iterative-search
        assert_eq!(recovered, exact);
        let recovered_plan: Vec<String> = sqlx::query_scalar(
            "EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
             SELECT id FROM documents WHERE tenant_id = $1
             ORDER BY embedding <-> '[0,0,0]'::vector LIMIT 5",
        ).bind("alpha").fetch_all(&mut *tx).await?;
        assert!(recovered_plan.iter().any(|line| line.contains("Index Scan using document_neighbors")));
        assert!(limited.iter().chain(recovered.iter()).all(|id| *id > 1000));
        println!("Vector comparison isolation={isolation}; exact plan:\n{}", exact_plan.join("\n"));
        println!("Filtered HNSW plan:\n{}", plan.join("\n"));
        println!("Iterative HNSW plan:\n{}", recovered_plan.join("\n"));
        println!("Synthetic authorized exact reference={exact:?}; limited HNSW={limited:?}; iterative HNSW={recovered:?}. No embedding-model or latency benchmark.");
        tx.rollback().await?;
        discard(pool, "ai_vector_review").await;
        Ok::<_, Box<dyn std::error::Error + Send + Sync>>(())
    }).await?
}

async fn execute_approved_intent(
    pool: &PgPool,
    principal: &Principal,
    intent: &str,
) -> Result<i32> {
    let mut tx = pool.begin().await?;
    let amount: Option<i32> = sqlx::query_scalar(
        "SELECT amount FROM ai_intent_review.approved_intents
         WHERE tenant_id = $1 AND intent_id = $2 FOR UPDATE",
    )
    .bind(principal.tenant)
    .bind(intent)
    .fetch_optional(&mut *tx)
    .await?;
    let Some(amount) = amount else {
        tx.rollback().await?;
        return Err("intent is not approved for this tenant".into());
    };
    let inserted = sqlx::query(
        "INSERT INTO ai_intent_review.intent_receipts(tenant_id, intent_id, amount)
         VALUES ($1, $2, $3) ON CONFLICT(tenant_id, intent_id) DO NOTHING",
    )
    .bind(principal.tenant)
    .bind(intent)
    .bind(amount)
    .execute(&mut *tx)
    .await?
    .rows_affected();
    let recorded: i32 = sqlx::query_scalar(
        "SELECT amount FROM ai_intent_review.intent_receipts
         WHERE tenant_id = $1 AND intent_id = $2",
    )
    .bind(principal.tenant)
    .bind(intent)
    .fetch_one(&mut *tx)
    .await?;
    if recorded != amount {
        tx.rollback().await?;
        return Err("approved input changed after execution".into());
    }
    if inserted == 1 {
        let changed = sqlx::query(
            "UPDATE ai_intent_review.balances SET units = units + $2 WHERE tenant_id = $1",
        )
        .bind(principal.tenant)
        .bind(amount)
        .execute(&mut *tx)
        .await?
        .rows_affected();
        if changed != 1 {
            tx.rollback().await?;
            return Err("tenant balance missing".into());
        }
    }
    tx.commit().await?;
    Ok(recorded)
}

#[tokio::test]
async fn fresh_attempt_keys_repeat_one_intent_but_a_stored_intent_does_not() -> Result<()> {
    assert_eq!(std::env::var("GITHUB_ACTIONS").as_deref(), Ok("true"));
    timeout(Duration::from_secs(20), async {
        let pool = database("ai_intent_review").await;
        sqlx::raw_sql(
            "CREATE TABLE approved_intents(
                 tenant_id text NOT NULL, intent_id text NOT NULL,
                 amount integer NOT NULL CHECK(amount > 0),
                 PRIMARY KEY(tenant_id, intent_id));
             CREATE TABLE intent_receipts(
                 tenant_id text NOT NULL, intent_id text NOT NULL,
                 amount integer NOT NULL CHECK(amount > 0),
                 PRIMARY KEY(tenant_id, intent_id));
             CREATE TABLE attempt_receipts(
                 tenant_id text NOT NULL, attempt_id text NOT NULL,
                 intent_id text NOT NULL, PRIMARY KEY(tenant_id, attempt_id));
             CREATE TABLE balances(
                 tenant_id text PRIMARY KEY, units integer NOT NULL,
                 per_attempt_units integer NOT NULL);
             INSERT INTO approved_intents VALUES
                 ('alpha', 'checkout-42', 30), ('beta', 'beta-only', 90);
             INSERT INTO balances VALUES ('alpha', 0, 0), ('beta', 0, 0)",
        ).execute(&pool).await?;
        // Negative control: each attempt has an atomic receipt but a fresh identity.
        for attempt in ["agent-attempt-a", "agent-attempt-b"] {
            let mut tx = pool.begin().await?;
            sqlx::query(
                "INSERT INTO attempt_receipts VALUES ('alpha', $1, 'checkout-42')",
            ).bind(attempt).execute(&mut *tx).await?;
            sqlx::query(
                "UPDATE balances SET per_attempt_units = per_attempt_units + 30
                 WHERE tenant_id = 'alpha'",
            ).execute(&mut *tx).await?;
            tx.commit().await?;
        }
        let principal = Principal { tenant: "alpha" };
        let observer = PgPoolOptions::new().max_connections(1)
            .connect(&std::env::var("SQL_RUST_PG_URL")?).await?;
        let mut gate = pool.begin().await?;
        sqlx::query("SELECT amount FROM approved_intents
                     WHERE tenant_id = 'alpha' AND intent_id = 'checkout-42' FOR UPDATE")
            .execute(&mut *gate).await?;
        let calls = async {
            tokio::join!(
                execute_approved_intent(&pool, &principal, "checkout-42"),
                execute_approved_intent(&pool, &principal, "checkout-42"),
            )
        };
        let release = async {
            timeout(Duration::from_secs(2), async {
                loop {
                    let waiting: i64 = sqlx::query_scalar(
                        "SELECT count(*) FROM pg_stat_activity
                         WHERE datname = current_database() AND wait_event_type = 'Lock'
                         AND query LIKE '%ai_intent_review.approved_intents%'",
                    ).fetch_one(&observer).await?;
                    if waiting == 2 { break Ok::<_, sqlx::Error>(()); }
                    tokio::time::sleep(Duration::from_millis(10)).await;
                }
            }).await??;
            gate.rollback().await?;
            Ok::<_, Box<dyn std::error::Error + Send + Sync>>(())
        };
        let ((first, retry), released) = tokio::join!(calls, release);
        released?;
        observer.close().await;
        assert_eq!((first?, retry?), (30, 30));
        assert!(execute_approved_intent(&pool, &principal, "beta-only").await.is_err());
        // A new pool reloads the stored intent; this is not a process-crash test.
        let options = (*pool.connect_options()).clone();
        pool.close().await;
        let reopened = PgPoolOptions::new().max_connections(2).connect_with(options).await?;
        assert_eq!(execute_approved_intent(&reopened, &principal, "checkout-42").await?, 30);
        sqlx::query(
            "UPDATE ai_intent_review.approved_intents SET amount = 31
             WHERE tenant_id = 'alpha' AND intent_id = 'checkout-42'",
        ).execute(&reopened).await?;
        assert!(execute_approved_intent(&reopened, &principal, "checkout-42").await.is_err());
        let balances: (i32, i32) = sqlx::query_as(
            "SELECT units, per_attempt_units FROM ai_intent_review.balances WHERE tenant_id = 'alpha'",
        ).fetch_one(&reopened).await?;
        assert_eq!(balances, (30, 60));
        let receipts: i64 = sqlx::query_scalar("SELECT count(*) FROM ai_intent_review.intent_receipts")
            .fetch_one(&reopened).await?;
        let attempts: i64 = sqlx::query_scalar("SELECT count(*) FROM ai_intent_review.attempt_receipts")
            .fetch_one(&reopened).await?;
        assert_eq!((receipts, attempts), (1, 2));
        let beta: i32 = sqlx::query_scalar(
            "SELECT units FROM ai_intent_review.balances WHERE tenant_id = 'beta'",
        ).fetch_one(&reopened).await?;
        assert_eq!(beta, 0);
        println!("Intent identity: two per-attempt receipts applied 60 units; one approved-intent receipt applied 30. Concurrent and fresh-pool retries reused the receipt; foreign intent and changed approval were rejected. No live agent or external effect was exercised.");
        discard(reopened, "ai_intent_review").await;
        Ok::<_, Box<dyn std::error::Error + Send + Sync>>(())
    }).await?
}
