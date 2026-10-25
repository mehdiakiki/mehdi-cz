use sql_rust_postgres_sqlite::{pg::Fixture, Result};
use sqlx::{Connection, PgPool};

async fn check(pool: &PgPool) -> Result<()> {
    sqlx::raw_sql(
        "CREATE TABLE stock (id integer PRIMARY KEY, available integer NOT NULL);
                   INSERT INTO stock VALUES (1, 10);",
    )
    .execute(pool)
    .await?;
    let mut reader = pool.acquire().await?;
    let mut writer = pool.acquire().await?;
    // article-example:start
    let mut tx = reader.begin().await?;
    sqlx::query("SET TRANSACTION ISOLATION LEVEL READ COMMITTED")
        .execute(&mut *tx)
        .await?;
    let first: i32 = sqlx::query_scalar("SELECT available FROM stock WHERE id = 1")
        .fetch_one(&mut *tx)
        .await?;
    sqlx::query("UPDATE stock SET available = 9 WHERE id = 1")
        .execute(&mut *writer)
        .await?;
    let second: i32 = sqlx::query_scalar("SELECT available FROM stock WHERE id = 1")
        .fetch_one(&mut *tx)
        .await?;
    tx.commit().await?;
    assert_eq!((first, second), (10, 9));
    // article-example:end
    sqlx::query("UPDATE stock SET available = 10 WHERE id = 1")
        .execute(&mut *writer)
        .await?;
    let mut tx = reader.begin().await?;
    sqlx::query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        .execute(&mut *tx)
        .await?;
    let before: i32 = sqlx::query_scalar("SELECT available FROM stock WHERE id = 1")
        .fetch_one(&mut *tx)
        .await?;
    sqlx::query("UPDATE stock SET available = 8 WHERE id = 1")
        .execute(&mut *writer)
        .await?;
    let during: i32 = sqlx::query_scalar("SELECT available FROM stock WHERE id = 1")
        .fetch_one(&mut *tx)
        .await?;
    assert_eq!((before, during), (10, 10));
    tx.commit().await?;
    let after: i32 = sqlx::query_scalar("SELECT available FROM stock WHERE id = 1")
        .fetch_one(&mut *reader)
        .await?;
    assert_eq!(after, 8);
    println!("Read Committed: 10 then 9. Repeatable Read: 10 then 10, followed by 8 after commit.");
    Ok(())
}
async fn run() -> Result<()> {
    let fixture = Fixture::new().await?;
    let outcome = check(&fixture.pool).await;
    fixture.finish(outcome).await
}
#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> {
    tokio::time::timeout(std::time::Duration::from_secs(30), run()).await?
}
#[tokio::test]
async fn integration() -> Result<()> {
    tokio::time::timeout(std::time::Duration::from_secs(30), run()).await?
}
