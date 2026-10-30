use axum::{
    body::Body,
    extract::{Path, State},
    http::{Request, StatusCode},
    routing::post,
    Router,
};
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::{collections::HashMap, error::Error, sync::Arc, time::Duration};
use tokio::sync::{oneshot, Barrier, Mutex};
use tower::ServiceExt;

type Result<T> = std::result::Result<T, Box<dyn Error>>;

async fn fixture(schema: &'static str) -> Result<(PgPool, PgPool)> {
    let url = std::env::var("SQL_RUST_PG_URL")?;
    let admin = PgPool::connect(&url).await?;
    sqlx::query(&format!("CREATE SCHEMA {schema}"))
        .execute(&admin)
        .await?;
    let pool = scoped_pool(schema).await?;
    Ok((admin, pool))
}

async fn scoped_pool(schema: &'static str) -> std::result::Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(4)
        .after_connect(move |connection, _| {
            Box::pin(async move {
                sqlx::query(&format!("SET search_path = {schema}"))
                    .execute(connection)
                    .await?;
                Ok(())
            })
        })
        .connect(&std::env::var("SQL_RUST_PG_URL").expect("CI database URL"))
        .await
}

async fn finish(admin: PgPool, pool: PgPool, schema: &str) -> Result<()> {
    pool.close().await;
    sqlx::query(&format!("DROP SCHEMA {schema} CASCADE"))
        .execute(&admin)
        .await?;
    admin.close().await;
    Ok(())
}

async fn checkout(pool: &PgPool, commit: bool) -> std::result::Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;
    sqlx::query("UPDATE stock SET quantity = quantity - 1 WHERE id = 1")
        .execute(&mut *tx)
        .await?;
    sqlx::query("INSERT INTO orders VALUES (42, 'shipping_pending')")
        .execute(&mut *tx)
        .await?;
    sqlx::query("INSERT INTO shipping_outbox VALUES ('ship-42', 42, 'pending')")
        .execute(&mut *tx)
        .await?;
    if commit {
        tx.commit().await?;
    } else {
        tx.rollback().await?;
    }
    Ok(())
}

type Provider = Arc<Mutex<HashMap<String, i64>>>;

async fn deliver(
    pool: PgPool,
    provider: Provider,
    accepted: Option<oneshot::Sender<()>>,
) -> std::result::Result<(), sqlx::Error> {
    let command: Option<(String, i64)> = sqlx::query_as(
        "SELECT command_id, order_id FROM shipping_outbox WHERE state = 'pending'",
    )
    .fetch_optional(&pool)
    .await?;
    if let Some((key, order)) = command {
        {
            let mut remote = provider.lock().await;
            let original = remote.entry(key.clone()).or_insert(order);
            assert_eq!(*original, order);
        }
        if let Some(signal) = accepted {
            signal.send(()).unwrap();
            std::future::pending::<()>().await;
        }
        let mut tx = pool.begin().await?;
        sqlx::query("UPDATE shipping_outbox SET state = 'done' WHERE command_id = $1")
            .bind(&key)
            .execute(&mut *tx)
            .await?;
        sqlx::query("UPDATE orders SET state = 'shipping_confirmed' WHERE id = $1")
            .bind(order)
            .execute(&mut *tx)
            .await?;
        tx.commit().await?;
    }
    Ok(())
}

#[tokio::test]
async fn outbox_recovers_after_provider_acceptance_without_holding_stock() -> Result<()> {
    const SCHEMA: &str = "practical_release_outbox";
    let (admin, pool) = fixture(SCHEMA).await?;
    for ddl in [
        "CREATE TABLE stock (id integer PRIMARY KEY, quantity integer NOT NULL)",
        "INSERT INTO stock VALUES (1, 2)",
        "CREATE TABLE orders (id bigint PRIMARY KEY, state text NOT NULL)",
        "CREATE TABLE shipping_outbox (command_id text PRIMARY KEY, order_id bigint NOT NULL REFERENCES orders, state text NOT NULL)",
    ] {
        sqlx::query(ddl).execute(&pool).await?;
    }
    checkout(&pool, false).await?;
    let rolled_back: (i32, i64, i64) = sqlx::query_as(
        "SELECT quantity, (SELECT count(*) FROM orders), (SELECT count(*) FROM shipping_outbox) FROM stock",
    ).fetch_one(&pool).await?;
    assert_eq!(rolled_back, (2, 0, 0));
    checkout(&pool, true).await?;
    pool.close().await;
    let reopened = scoped_pool(SCHEMA).await?;
    let pending: (i32, String, String) = sqlx::query_as(
        "SELECT quantity, orders.state, shipping_outbox.state FROM stock CROSS JOIN orders CROSS JOIN shipping_outbox",
    ).fetch_one(&reopened).await?;
    assert_eq!(pending, (1, "shipping_pending".into(), "pending".into()));
    let provider = Provider::default();
    let (accepted, observed) = oneshot::channel();
    let worker = tokio::spawn(deliver(reopened.clone(), provider.clone(), Some(accepted)));
    tokio::time::timeout(Duration::from_secs(5), observed).await??;
    let mut other = reopened.begin().await?;
    sqlx::query("SET LOCAL lock_timeout = '500ms'")
        .execute(&mut *other).await?;
    sqlx::query("UPDATE stock SET quantity = quantity WHERE id = 1")
        .execute(&mut *other).await?;
    other.commit().await?;
    worker.abort();
    assert!(worker.await.unwrap_err().is_cancelled());
    deliver(reopened.clone(), provider.clone(), None).await?;
    deliver(reopened.clone(), provider.clone(), None).await?;
    let states: (String, String) = sqlx::query_as(
        "SELECT orders.state, shipping_outbox.state FROM orders CROSS JOIN shipping_outbox",
    ).fetch_one(&reopened).await?;
    assert_eq!(states, ("shipping_confirmed".into(), "done".into()));
    assert_eq!(provider.lock().await.len(), 1);
    println!("outbox: rollback=(2,0,0); reconnect=pending; stock update while provider paused=ok; cancelled worker replay=one provider key, done");
    finish(admin, reopened, SCHEMA).await
}

async fn apply_event(pool: PgPool, payload: &str) -> std::result::Result<&'static str, sqlx::Error> {
    let mut tx = pool.begin().await?;
    let claimed: Option<String> = sqlx::query_scalar(
        "INSERT INTO received_events (tenant_id, provider, event_id, payload_hash)
         VALUES ('tenant-a', 'fixture', 'event-42', $1)
         ON CONFLICT (tenant_id, provider, event_id) DO NOTHING RETURNING event_id",
    )
    .bind(payload)
    .fetch_optional(&mut *tx)
    .await?;
    let outcome = if claimed.is_some() {
        sqlx::query("UPDATE business_effect SET value = value + 1")
            .execute(&mut *tx).await?;
        "applied"
    } else {
        let original: String = sqlx::query_scalar("SELECT payload_hash FROM received_events")
            .fetch_one(&mut *tx).await?;
        if original == payload { "duplicate" } else { "conflict" }
    };
    tx.commit().await?;
    Ok(outcome)
}

#[tokio::test]
async fn concurrent_webhooks_commit_one_effect_and_reject_changed_content() -> Result<()> {
    const SCHEMA: &str = "practical_release_webhook";
    let (admin, pool) = fixture(SCHEMA).await?;
    sqlx::query("CREATE TABLE business_effect (value integer NOT NULL)").execute(&pool).await?;
    sqlx::query("INSERT INTO business_effect VALUES (0)").execute(&pool).await?;
    sqlx::query("CREATE TABLE received_events (tenant_id text, provider text, event_id text, payload_hash text NOT NULL, PRIMARY KEY (tenant_id, provider, event_id))").execute(&pool).await?;
    let gate = Arc::new(Barrier::new(3));
    let mut tasks = Vec::new();
    for _ in 0..2 {
        let (pool, gate) = (pool.clone(), gate.clone());
        tasks.push(tokio::spawn(async move {
            gate.wait().await;
            apply_event(pool, "synthetic-payload-a").await
        }));
    }
    gate.wait().await;
    let mut outcomes = vec![tasks.remove(0).await??, tasks.remove(0).await??];
    outcomes.sort();
    assert_eq!(outcomes, ["applied", "duplicate"]);
    assert_eq!(apply_event(pool.clone(), "changed-payload").await?, "conflict");
    let stored: (i32, i64) = sqlx::query_as(
        "SELECT value, (SELECT count(*) FROM received_events) FROM business_effect",
    ).fetch_one(&pool).await?;
    assert_eq!(stored, (1, 1));
    println!("webhooks: simultaneous outcomes=applied,duplicate; changed payload=conflict; effect=1; receipt=1");
    finish(admin, pool, SCHEMA).await
}

#[tokio::test]
async fn runtime_identity_can_write_data_but_cannot_take_schema_ownership() -> Result<()> {
    let admin = PgPool::connect(&std::env::var("SQL_RUST_PG_URL")?).await?;
    sqlx::query("CREATE ROLE practical_release_owner NOLOGIN").execute(&admin).await?;
    sqlx::query("CREATE SCHEMA practical_release_roles AUTHORIZATION practical_release_owner").execute(&admin).await?;
    let mut migration = admin.acquire().await?;
    sqlx::query("SET ROLE practical_release_owner").execute(&mut *migration).await?;
    sqlx::query("CREATE TABLE practical_release_roles.migration_probe (id integer PRIMARY KEY, value integer NOT NULL)").execute(&mut *migration).await?;
    sqlx::query("RESET ROLE").execute(&mut *migration).await?;
    drop(migration);
    sqlx::query("GRANT USAGE ON SCHEMA practical_release_roles TO editorial_app").execute(&admin).await?;
    sqlx::query("GRANT SELECT, INSERT, UPDATE ON practical_release_roles.migration_probe TO editorial_app").execute(&admin).await?;
    let app = PgPool::connect(&std::env::var("SQL_RUST_PG_APP_URL")?).await?;
    sqlx::query("INSERT INTO practical_release_roles.migration_probe VALUES (1, 10)").execute(&app).await?;
    sqlx::query("UPDATE practical_release_roles.migration_probe SET value = 11 WHERE id = 1").execute(&app).await?;
    let value: i32 = sqlx::query_scalar("SELECT value FROM practical_release_roles.migration_probe WHERE id = 1").fetch_one(&app).await?;
    assert_eq!(value, 11);
    for statement in [
        "ALTER TABLE practical_release_roles.migration_probe ADD COLUMN forbidden integer",
        "CREATE TABLE practical_release_roles.forbidden (id integer)",
        "SET ROLE practical_release_owner",
    ] {
        let error = sqlx::query(statement).execute(&app).await.expect_err("runtime privilege boundary");
        assert_eq!(error.as_database_error().unwrap().code().as_deref(), Some("42501"));
    }
    let member: bool = sqlx::query_scalar("SELECT pg_has_role(current_user, 'practical_release_owner', 'MEMBER')").fetch_one(&app).await?;
    assert!(!member);
    let added: i64 = sqlx::query_scalar("SELECT count(*) FROM information_schema.columns WHERE table_schema = 'practical_release_roles' AND column_name = 'forbidden'").fetch_one(&admin).await?;
    assert_eq!(added, 0);
    app.close().await;
    sqlx::query("DROP SCHEMA practical_release_roles CASCADE").execute(&admin).await?;
    sqlx::query("DROP ROLE practical_release_owner").execute(&admin).await?;
    println!("roles: runtime insert/update/read=11; ALTER,CREATE,SET ROLE=42501; owner membership=false; forbidden column=absent");
    admin.close().await;
    Ok(())
}

async fn create_order(State(pool): State<PgPool>, Path(id): Path<i32>) -> StatusCode {
    let result = async {
        let mut tx = pool.begin().await?;
        sqlx::query("INSERT INTO orders (id, customer_id) VALUES ($1, $1)")
            .bind(id)
            .execute(&mut *tx)
            .await?;
        tx.commit().await?;
        Ok::<(), sqlx::Error>(())
    }
    .await;
    match result {
        Ok(()) => StatusCode::CREATED,
        Err(error) if error.as_database_error().and_then(|e| e.code()).as_deref() == Some("23503") => {
            StatusCode::CONFLICT
        }
        Err(_) => StatusCode::SERVICE_UNAVAILABLE,
    }
}

#[tokio::test]
async fn http_status_follows_commit_and_a_discarded_reply_does_not_undo_it() -> Result<()> {
    const SCHEMA: &str = "practical_release_http_commit";
    let (admin, pool) = fixture(SCHEMA).await?;
    sqlx::query("CREATE TABLE customers (id integer PRIMARY KEY)").execute(&pool).await?;
    sqlx::query("INSERT INTO customers VALUES (1), (2)").execute(&pool).await?;
    sqlx::query("CREATE TABLE orders (id integer PRIMARY KEY, customer_id integer REFERENCES customers DEFERRABLE INITIALLY DEFERRED)").execute(&pool).await?;
    let app = Router::new().route("/orders/{id}", post(create_order)).with_state(pool.clone());
    let bad = app.clone().oneshot(Request::post("/orders/999").body(Body::empty())?).await?;
    assert_eq!(bad.status(), StatusCode::CONFLICT);
    let count: i64 = sqlx::query_scalar("SELECT count(*) FROM orders").fetch_one(&pool).await?;
    assert_eq!(count, 0);
    let good = app.clone().oneshot(Request::post("/orders/1").body(Body::empty())?).await?;
    assert_eq!(good.status(), StatusCode::CREATED);
    let lost = app.oneshot(Request::post("/orders/2").body(Body::empty())?).await?;
    assert_eq!(lost.status(), StatusCode::CREATED);
    drop(lost);
    let ids: Vec<i32> = sqlx::query_scalar("SELECT id FROM orders ORDER BY id").fetch_all(&pool).await?;
    assert_eq!(ids, [1, 2]);
    println!("HTTP commit: deferred FK rejection=409, zero orders; commit=201; discarded response leaves ids=[1,2]");
    finish(admin, pool, SCHEMA).await
}

async fn import_row(pool: &PgPool, source: &str, version: i32, quantity: Option<i32>) -> std::result::Result<String, sqlx::Error> {
    let mut tx = pool.begin().await?;
    let claimed: Option<String> = sqlx::query_scalar(
        "INSERT INTO import_attempts (source_id, version, quantity, outcome)
         VALUES ($1, $2, $3, 'pending') ON CONFLICT DO NOTHING RETURNING source_id",
    ).bind(source).bind(version).bind(quantity).fetch_optional(&mut *tx).await?;
    if claimed.is_none() {
        let previous: (Option<i32>, String) = sqlx::query_as(
            "SELECT quantity, outcome FROM import_attempts WHERE source_id = $1 AND version = $2",
        ).bind(source).bind(version).fetch_one(&mut *tx).await?;
        tx.rollback().await?;
        return Ok(if previous.0 == quantity { previous.1 } else { "input_conflict".into() });
    }
    let outcome = if let Some(value) = quantity {
        sqlx::query("SAVEPOINT one_row").execute(&mut *tx).await?;
        let inserted = sqlx::query("INSERT INTO imported_rows VALUES ($1, $2)")
            .bind(source).bind(value).execute(&mut *tx).await;
        match inserted {
            Ok(_) => "accepted",
            Err(error) if error.as_database_error().and_then(|e| e.code()).as_deref() == Some("23514") => {
                let failed = sqlx::query("SELECT 1").execute(&mut *tx).await.unwrap_err();
                assert_eq!(failed.as_database_error().unwrap().code().as_deref(), Some("25P02"));
                sqlx::query("ROLLBACK TO SAVEPOINT one_row").execute(&mut *tx).await?;
                "constraint_rejected"
            }
            Err(error) => return Err(error),
        }
    } else {
        "parse_rejected"
    };
    sqlx::query("UPDATE import_attempts SET outcome = $3 WHERE source_id = $1 AND version = $2")
        .bind(source).bind(version).bind(outcome).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(outcome.into())
}

#[tokio::test]
async fn rejected_rows_keep_history_and_corrected_replay_is_repeatable() -> Result<()> {
    const SCHEMA: &str = "practical_release_import";
    let (admin, pool) = fixture(SCHEMA).await?;
    sqlx::query("CREATE TABLE import_attempts (source_id text CHECK (length(source_id) <= 64), version integer, quantity integer, outcome text NOT NULL, PRIMARY KEY (source_id, version))").execute(&pool).await?;
    sqlx::query("CREATE TABLE imported_rows (source_id text PRIMARY KEY, quantity integer NOT NULL CHECK (quantity > 0))").execute(&pool).await?;
    assert_eq!(import_row(&pool, "good", 0, Some(10)).await?, "accepted");
    assert_eq!(import_row(&pool, "repair", 0, Some(-1)).await?, "constraint_rejected");
    let parsed = "not-an-integer".parse::<i32>().ok();
    assert_eq!(import_row(&pool, "malformed", 0, parsed).await?, "parse_rejected");
    pool.close().await;
    let reopened = scoped_pool(SCHEMA).await?;
    assert_eq!(import_row(&reopened, "good", 0, Some(10)).await?, "accepted");
    assert_eq!(import_row(&reopened, "repair", 1, Some(12)).await?, "accepted");
    assert_eq!(import_row(&reopened, "repair", 1, Some(12)).await?, "accepted");
    assert_eq!(import_row(&reopened, "repair", 1, Some(13)).await?, "input_conflict");
    let history: Vec<(String, i32, String)> = sqlx::query_as(
        "SELECT source_id, version, outcome FROM import_attempts ORDER BY source_id, version",
    ).fetch_all(&reopened).await?;
    assert_eq!(history.len(), 4);
    assert!(history.contains(&("repair".into(), 0, "constraint_rejected".into())));
    assert!(history.contains(&("repair".into(), 1, "accepted".into())));
    let rows: Vec<(String, i32)> = sqlx::query_as("SELECT source_id, quantity FROM imported_rows ORDER BY source_id")
        .fetch_all(&reopened).await?;
    assert_eq!(rows, [("good".into(), 10), ("repair".into(), 12)]);
    println!("import: parse rejection persisted; constraint=23514 then 25P02; savepoint recovered; reconnect/replay keeps two business rows and four attempt records; changed input rejected");
    finish(admin, reopened, SCHEMA).await
}
