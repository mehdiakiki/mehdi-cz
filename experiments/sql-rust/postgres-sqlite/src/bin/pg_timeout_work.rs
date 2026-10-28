use sql_rust_postgres_sqlite::{pg::{code, Fixture}, Result};
use sqlx::{pool::PoolConnection, Connection, PgPool, Postgres};
use std::time::Duration;
use tokio::{sync::oneshot, time::timeout};

// article:start local-timeout
async fn stop_waiting(
    mut connection: PoolConnection<Postgres>,
    start_deadline: oneshot::Receiver<()>,
) -> Result<PoolConnection<Postgres>> {
    {
        let pending = sqlx::query("UPDATE deadline_item SET value = value + 1 WHERE id = 1")
            .execute(&mut *connection);
        tokio::pin!(pending);
        tokio::select! {
            result = &mut pending => {
                result?;
                return Err("the lock gate opened before the observation".into());
            }
            ready = start_deadline => { ready?; }
        }
        assert!(timeout(Duration::from_millis(100), &mut pending).await.is_err());
    }
    // The query future has been dropped. The connection remains owned here.
    Ok(connection)
}
// article:end local-timeout

async fn wait_for_blocker(pool: &PgPool, waiter: i32, holder: i32) -> Result<()> {
    timeout(Duration::from_secs(2), async {
        loop {
            let blocked: bool = sqlx::query_scalar(
                "SELECT $2 = ANY(pg_blocking_pids($1))",
            ).bind(waiter).bind(holder).fetch_one(pool).await?;
            if blocked { return Ok::<_, Box<dyn std::error::Error + Send + Sync>>(()); }
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
    }).await?
}

async fn check(pool: &PgPool) -> Result<()> {
    sqlx::raw_sql("CREATE TABLE deadline_item(id integer PRIMARY KEY, value integer NOT NULL);
        INSERT INTO deadline_item VALUES (1, 0)").execute(pool).await?;
    let mut holder = pool.begin().await?;
    let holder_pid: i32 = sqlx::query_scalar("SELECT pg_backend_pid()")
        .fetch_one(&mut *holder).await?;
    sqlx::query("UPDATE deadline_item SET value = 99 WHERE id = 1")
        .execute(&mut *holder).await?;
    let mut connection = pool.acquire().await?;
    sqlx::raw_sql("SET statement_timeout = '10s'; SET lock_timeout = '10s'")
        .execute(&mut *connection).await?;
    let waiter_pid: i32 = sqlx::query_scalar("SELECT pg_backend_pid()")
        .fetch_one(&mut *connection).await?;
    let (start, gate) = oneshot::channel();
    let task = tokio::spawn(stop_waiting(connection, gate));
    wait_for_blocker(pool, waiter_pid, holder_pid).await?;
    start.send(()).unwrap();
    let mut connection = task.await??;
    wait_for_blocker(pool, waiter_pid, holder_pid).await?;
    println!("Local timeout elapsed and query future dropped; the same PostgreSQL backend still waited on the exact holder PID.");
    holder.rollback().await?;
    let value: i32 = sqlx::query_scalar("SELECT value FROM deadline_item WHERE id = 1")
        .fetch_one(&mut *connection).await?;
    assert_eq!(value, 1);
    assert_eq!(sqlx::query_scalar::<_, i32>("SELECT value FROM deadline_item WHERE id = 1")
        .fetch_one(pool).await?, 1);
    println!("After releasing the row lock, the autocommit update completed once despite the caller's timeout; an independent read saw value=1.");

    let mut holder = pool.begin().await?;
    sqlx::query("UPDATE deadline_item SET value = 99 WHERE id = 1")
        .execute(&mut *holder).await?;
    // article:start server-timeout
    let mut tx = connection.begin().await?;
    sqlx::query("SET LOCAL statement_timeout = '200ms'")
        .execute(&mut *tx).await?;
    let error = sqlx::query("UPDATE deadline_item SET value = value + 1 WHERE id = 1")
        .execute(&mut *tx).await.unwrap_err();
    assert_eq!(code(&error).as_deref(), Some("57014"));
    let aborted = sqlx::query("SELECT 1").execute(&mut *tx).await.unwrap_err();
    assert_eq!(code(&aborted).as_deref(), Some("25P02"));
    tx.rollback().await?;
    // article:end server-timeout
    holder.rollback().await?;
    assert_eq!(sqlx::query_scalar::<_, i32>("SELECT value FROM deadline_item WHERE id = 1")
        .fetch_one(&mut *connection).await?, 1);
    println!("Server statement timeout returned 57014; transaction then returned 25P02 until rollback; a fresh query succeeded and no second increment survived.");
    Ok(())
}
async fn run() -> Result<()> {
    let fixture = Fixture::new().await?;
    let result = check(&fixture.pool).await;
    fixture.finish(result).await
}
#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> { timeout(Duration::from_secs(20), run()).await? }
#[tokio::test]
async fn integration() -> Result<()> { timeout(Duration::from_secs(20), run()).await? }
