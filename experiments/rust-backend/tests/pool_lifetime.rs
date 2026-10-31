use rust_backend_labs::{database, discard};
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::time::Duration;
use tokio::sync::oneshot;
use tokio::time::timeout;

async fn fixture(schema: &'static str) -> (PgPool, PgPool) {
    let admin = database(schema).await;
    sqlx::query(
        "CREATE TABLE pool_customers (id bigint PRIMARY KEY, revision bigint NOT NULL, \
         quote_cents bigint)",
    )
    .execute(&admin)
    .await
    .unwrap();
    sqlx::query("INSERT INTO pool_customers (id, revision) VALUES (1, 12)")
        .execute(&admin)
        .await
        .unwrap();

    let url = std::env::var("SQL_RUST_PG_URL").expect("Use the PostgreSQL GitHub job");
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(Duration::from_millis(200))
        .after_connect(move |connection, _| {
            Box::pin(async move {
                // schema is a fixed test constant, never request data.
                sqlx::query(&format!("SET search_path = {schema}"))
                    .execute(connection)
                    .await?;
                Ok(())
            })
        })
        .connect(&url)
        .await
        .unwrap();
    (admin, pool)
}

async fn wait_holding(
    pool: PgPool,
    entered: oneshot::Sender<()>,
    release: oneshot::Receiver<()>,
) -> Result<i64, sqlx::Error> {
    let mut connection = pool.acquire().await?;
    let revision = sqlx::query_scalar("SELECT revision FROM pool_customers WHERE id = 1")
        .fetch_one(&mut *connection)
        .await?;
    entered.send(()).expect("test is waiting for the handler");
    release.await.expect("test releases the dependency");
    drop(connection);
    Ok(revision)
}

async fn wait_released(
    pool: PgPool,
    entered: oneshot::Sender<()>,
    release: oneshot::Receiver<()>,
) -> Result<i64, sqlx::Error> {
    let revision = {
        let mut connection = pool.acquire().await?;
        sqlx::query_scalar("SELECT revision FROM pool_customers WHERE id = 1")
            .fetch_one(&mut *connection)
            .await?
    };
    entered.send(()).expect("test is waiting for the handler");
    release.await.expect("test releases the dependency");
    Ok(revision)
}

async fn save_quote(
    pool: &PgPool,
    customer_id: i64,
    expected_revision: i64,
    quote_cents: i64,
) -> Result<u64, sqlx::Error> {
    // article:quote-revision:start
    let changed = sqlx::query(
        "UPDATE pool_customers SET quote_cents = $1 \
         WHERE id = $2 AND revision = $3",
    )
    .bind(quote_cents)
    .bind(customer_id)
    .bind(expected_revision)
    .execute(pool)
    .await?
    .rows_affected();
    // article:quote-revision:end
    Ok(changed)
}

#[tokio::test]
async fn checkout_scope_decides_progress_before_the_dependency_is_released() {
    let (admin, pool) = fixture("backend_pool_lifetime").await;
    let (entered, started) = oneshot::channel();
    let (release, blocked) = oneshot::channel();
    let held = tokio::spawn(wait_holding(pool.clone(), entered, blocked));
    timeout(Duration::from_secs(5), started)
        .await
        .unwrap()
        .unwrap();
    assert!(pool.try_acquire().is_none());
    assert!(matches!(pool.acquire().await, Err(sqlx::Error::PoolTimedOut)));
    assert!(!held.is_finished());
    release.send(()).unwrap();
    assert_eq!(held.await.unwrap().unwrap(), 12);

    let (entered, started) = oneshot::channel();
    let (release, blocked) = oneshot::channel();
    let shortened = tokio::spawn(wait_released(pool.clone(), entered, blocked));
    timeout(Duration::from_secs(5), started)
        .await
        .unwrap()
        .unwrap();
    let probe: i32 = sqlx::query_scalar("SELECT 1")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(probe, 1);
    assert!(!shortened.is_finished());
    release.send(()).unwrap();
    assert_eq!(shortened.await.unwrap().unwrap(), 12);
    println!("held: PoolTimedOut; shortened: probe=1 before dependency release");
    pool.close().await;
    discard(admin, "backend_pool_lifetime").await;
}

#[tokio::test]
async fn cancellation_returns_the_connection_held_by_the_task() {
    let (admin, pool) = fixture("backend_pool_cancel").await;
    let (entered, started) = oneshot::channel();
    let (_release, blocked) = oneshot::channel();
    let held = tokio::spawn(wait_holding(pool.clone(), entered, blocked));
    timeout(Duration::from_secs(5), started)
        .await
        .unwrap()
        .unwrap();
    assert!(pool.try_acquire().is_none());
    held.abort();
    assert!(held.await.unwrap_err().is_cancelled());
    let probe: i32 = sqlx::query_scalar("SELECT 1")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(probe, 1);
    println!("cancelled handler: join completed; next database probe=1");
    pool.close().await;
    discard(admin, "backend_pool_cancel").await;
}

#[tokio::test]
async fn quote_save_checks_the_input_revision_and_the_affected_row_count() {
    let (admin, pool) = fixture("backend_pool_revision").await;
    let expected_revision: i64 =
        sqlx::query_scalar("SELECT revision FROM pool_customers WHERE id = 1")
            .fetch_one(&pool)
            .await
            .unwrap();
    // A different connection changes the quote inputs while the quote is calculated.
    sqlx::query("UPDATE pool_customers SET revision = revision + 1 WHERE id = 1")
        .execute(&admin)
        .await
        .unwrap();
    assert_eq!(save_quote(&pool, 1, expected_revision, 900).await.unwrap(), 0);
    let quote: Option<i64> = sqlx::query_scalar("SELECT quote_cents FROM pool_customers WHERE id = 1")
        .fetch_one(&admin)
        .await
        .unwrap();
    assert_eq!(quote, None);
    assert_eq!(save_quote(&pool, 1, 13, 1200).await.unwrap(), 1);
    let quote: i64 = sqlx::query_scalar("SELECT quote_cents FROM pool_customers WHERE id = 1")
        .fetch_one(&admin)
        .await
        .unwrap();
    assert_eq!(quote, 1200);
    println!("stale revision: affected=0, quote=NULL; current revision: affected=1, quote=1200");
    pool.close().await;
    discard(admin, "backend_pool_revision").await;
}
