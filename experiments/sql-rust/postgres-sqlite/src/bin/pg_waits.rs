use sql_rust_postgres_sqlite::{pg::Fixture, Result};
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::time::Duration;
use tokio::{sync::oneshot, time::timeout};

// article:start blockers
async fn blockers(pool: &PgPool, pid: i32) -> Result<(Option<String>, Vec<i32>)> {
    let observation = sqlx::query_as(
        "SELECT wait_event_type, pg_blocking_pids(pid)
         FROM pg_stat_activity WHERE pid = $1",
    )
    .bind(pid)
    .fetch_one(pool)
    .await?;
    Ok(observation)
}
// article:end blockers

async fn check(pool: &PgPool) -> Result<()> {
    let small = PgPoolOptions::new()
        .max_connections(1)
        .connect_with((*pool.connect_options()).clone())
        .await?;
    let (entered, entry) = oneshot::channel();
    let (release, gate) = oneshot::channel();
    let task_pool = small.clone();
    let task = tokio::spawn(async move {
        entered.send(()).unwrap();
        gate.await.unwrap();
        sqlx::query_scalar::<_, i32>("SELECT 1")
            .fetch_one(&task_pool)
            .await
    });
    entry.await?;
    let free = small
        .try_acquire()
        .expect("task waiting before acquire leaves pool free");
    drop(free);
    release.send(()).unwrap();
    assert_eq!(task.await??, 1);
    println!("Application gate: entered task, no acquire yet, connection available.");

    let mut held = small.acquire().await?;
    let pid: i32 = sqlx::query_scalar("SELECT pg_backend_pid()")
        .fetch_one(&mut *held)
        .await?;
    assert!(timeout(Duration::from_millis(100), small.acquire())
        .await
        .is_err());
    let state: String = sqlx::query_scalar("SELECT state FROM pg_stat_activity WHERE pid = $1")
        .bind(pid)
        .fetch_one(pool)
        .await?;
    assert_eq!(state, "idle");
    drop(held);
    let mut recovered = timeout(Duration::from_secs(3), small.acquire()).await??;
    assert_eq!(
        sqlx::query_scalar::<_, i32>("SELECT 2")
            .fetch_one(&mut *recovered)
            .await?,
        2
    );
    drop(recovered);
    small.close().await;
    println!("Pool gate: acquisition timed out while its only backend was idle; releasing the handle restored service.");

    sqlx::raw_sql(
        "CREATE TABLE wait_item(id integer PRIMARY KEY, value integer NOT NULL);
        INSERT INTO wait_item VALUES (1, 0)",
    )
    .execute(pool)
    .await?;
    let mut holder = pool.begin().await?;
    let holder_pid: i32 = sqlx::query_scalar("SELECT pg_backend_pid()")
        .fetch_one(&mut *holder)
        .await?;
    sqlx::query("UPDATE wait_item SET value = value + 1 WHERE id = 1")
        .execute(&mut *holder)
        .await?;
    let mut waiter = pool.acquire().await?;
    sqlx::query("SET lock_timeout = '3s'")
        .execute(&mut *waiter)
        .await?;
    let waiter_pid: i32 = sqlx::query_scalar("SELECT pg_backend_pid()")
        .fetch_one(&mut *waiter)
        .await?;
    let task = tokio::spawn(async move {
        sqlx::query("UPDATE wait_item SET value = value + 1 WHERE id = 1")
            .execute(&mut *waiter)
            .await
    });
    timeout(Duration::from_secs(2), async {
        loop {
            let (kind, pids) = blockers(pool, waiter_pid).await?;
            if kind.as_deref() == Some("Lock") && pids.contains(&holder_pid) {
                break Ok::<_, Box<dyn std::error::Error + Send + Sync>>(());
            }
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
    })
    .await??;
    holder.rollback().await?;
    assert_eq!(task.await??.rows_affected(), 1);
    assert_eq!(
        sqlx::query_scalar::<_, i32>("SELECT value FROM wait_item")
            .fetch_one(pool)
            .await?,
        1
    );
    println!("Database gate: waiter acquired a connection; observed Lock and the exact holder PID before rollback released it.");
    Ok(())
}

async fn run() -> Result<()> {
    let fixture = Fixture::new().await?;
    let result = check(&fixture.pool).await;
    fixture.finish(result).await
}
#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> {
    timeout(Duration::from_secs(20), run()).await?
}
#[tokio::test]
async fn integration() -> Result<()> {
    timeout(Duration::from_secs(20), run()).await?
}
