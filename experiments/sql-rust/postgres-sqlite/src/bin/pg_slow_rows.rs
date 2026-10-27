use futures_util::TryStreamExt;
use sql_rust_postgres_sqlite::{pg::Fixture, Result};
use sqlx::{postgres::PgPoolOptions, PgPool, Row};
use std::{sync::{Arc, atomic::{AtomicUsize, Ordering}}, time::Duration};
use tokio::{sync::oneshot, time::timeout};

// article:start consume
async fn consume(
    pool: PgPool,
    first: oneshot::Sender<()>,
    resume: oneshot::Receiver<()>,
    seen: Arc<AtomicUsize>,
) -> Result<()> {
    let mut connection = pool.acquire().await?;
    let mut rows = sqlx::query(
        "SELECT i, repeat('x', 1024) AS payload FROM generate_series(1, 32) AS i",
    ).fetch(&mut *connection);
    let row = rows.try_next().await?.ok_or("missing first row")?;
    assert_eq!(row.try_get::<i32, _>("i")?, 1);
    assert_eq!(row.try_get::<String, _>("payload")?.len(), 1024);
    seen.fetch_add(1, Ordering::SeqCst);
    first.send(()).map_err(|_| "observer left")?;
    resume.await?;
    while let Some(row) = rows.try_next().await? {
        assert_eq!(row.try_get::<String, _>("payload")?.len(), 1024);
        seen.fetch_add(1, Ordering::SeqCst);
    }
    Ok(())
}
// article:end consume

async fn check(pool: &PgPool) -> Result<()> {
    let small = PgPoolOptions::new().max_connections(1)
        .connect_with((*pool.connect_options()).clone()).await?;
    for cancel in [false, true] {
        let (first, observed) = oneshot::channel();
        let (release, gate) = oneshot::channel();
        let seen = Arc::new(AtomicUsize::new(0));
        let task = tokio::spawn(consume(small.clone(), first, gate, seen.clone()));
        observed.await?;
        assert_eq!(seen.load(Ordering::SeqCst), 1);
        assert!(timeout(Duration::from_millis(100), small.acquire()).await.is_err());
        if cancel {
            task.abort();
            assert!(task.await.unwrap_err().is_cancelled());
            drop(release);
        } else {
            release.send(()).unwrap();
            task.await??;
            assert_eq!(seen.load(Ordering::SeqCst), 32);
        }
        let mut next = timeout(Duration::from_secs(3), small.acquire()).await??;
        assert_eq!(sqlx::query_scalar::<_, i32>("SELECT 99")
            .fetch_one(&mut *next).await?, 99);
        println!("cancel={cancel}: paused at one decoded row; second acquire timed out; next borrower received SELECT 99 after release.");
    }
    let collected = sqlx::query("SELECT repeat('x', 1024) FROM generate_series(1, 32)")
        .fetch_all(&small).await?;
    let mut next = timeout(Duration::from_secs(3), small.acquire()).await??;
    assert_eq!(collected.len(), 32);
    assert_eq!(sqlx::query_scalar::<_, i32>("SELECT 7").fetch_one(&mut *next).await?, 7);
    println!("Collected case: all 32 decoded rows still retained, connection reusable. No RSS or wire-buffer measurement.");
    drop(next);
    small.close().await;
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
