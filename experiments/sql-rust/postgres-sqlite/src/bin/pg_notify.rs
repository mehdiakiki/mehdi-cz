use sql_rust_postgres_sqlite::{pg::Fixture, Result};
use sqlx::{postgres::PgListener, PgPool};
use std::time::Duration;

async fn publish(pool: &PgPool, channel: &str, id: i32) -> Result<()> {
    let mut tx = pool.begin().await?;
    sqlx::query("INSERT INTO work (id, done) VALUES ($1, false)")
        .bind(id)
        .execute(&mut *tx)
        .await?;
    sqlx::query("SELECT pg_notify($1, 'changed')")
        .bind(channel)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(())
}
async fn pending(pool: &PgPool) -> Result<Vec<i32>> {
    Ok(
        sqlx::query_scalar("SELECT id FROM work WHERE NOT done ORDER BY id")
            .fetch_all(pool)
            .await?,
    )
}
async fn check(pool: &PgPool, channel: &str) -> Result<()> {
    sqlx::query("CREATE TABLE work (id integer PRIMARY KEY, done boolean NOT NULL)")
        .execute(pool)
        .await?;
    let url = std::env::var("SQL_RUST_PG_URL")?;
    let mut listener = PgListener::connect(&url).await?;
    listener.listen(channel).await?;
    publish(pool, channel, 1).await?;
    let event = tokio::time::timeout(Duration::from_secs(3), listener.recv()).await??;
    assert_eq!(event.payload(), "changed");
    assert_eq!(pending(pool).await?, vec![1]);
    sqlx::query("UPDATE work SET done = true WHERE id = 1")
        .execute(pool)
        .await?;
    drop(listener);
    publish(pool, channel, 2).await?;
    // article-example:start
    let mut reconnected = PgListener::connect(&url).await?;
    reconnected.listen(channel).await?;
    let recovered = pending(pool).await?;
    assert_eq!(recovered, vec![2]);
    let old_event = tokio::time::timeout(Duration::from_millis(100), reconnected.recv()).await;
    assert!(old_event.is_err());
    // article-example:end
    publish(pool, channel, 3).await?;
    assert_eq!(
        tokio::time::timeout(Duration::from_secs(3), reconnected.recv())
            .await??
            .payload(),
        "changed"
    );
    assert_eq!(pending(pool).await?, vec![2, 3]);
    sqlx::query("UPDATE work SET done = true WHERE NOT done")
        .execute(pool)
        .await?;
    assert!(pending(pool).await?.is_empty());
    drop(reconnected);
    println!("Live notification arrived; new listener had no historical event for work 2; durable scan recovered it; next live notification and scan found work 3.");
    Ok(())
}
async fn run() -> Result<()> {
    let fixture = Fixture::new().await?;
    let channel = format!("{}_events", fixture.schema);
    let outcome = check(&fixture.pool, &channel).await;
    fixture.finish(outcome).await
}
#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> {
    tokio::time::timeout(Duration::from_secs(30), run()).await?
}
#[tokio::test]
async fn integration() -> Result<()> {
    tokio::time::timeout(Duration::from_secs(30), run()).await?
}
