use sql_rust_postgres_sqlite::{pg::Fixture, Result};
use sqlx::PgPool;

async fn check(pool: &PgPool) -> Result<()> {
    sqlx::raw_sql("CREATE TABLE hot_rows (id integer PRIMARY KEY, label text NOT NULL, visits integer NOT NULL, padding text)
        WITH (fillfactor = 50); CREATE INDEX hot_label ON hot_rows (label);
        INSERT INTO hot_rows VALUES (1, 'first', 0, repeat('x', 100));").execute(pool).await?;
    let mut tx = pool.begin().await?;
    // article-example:start
    for _ in 0..10 {
        sqlx::query("UPDATE hot_rows SET visits = visits + 1 WHERE id = 1")
            .execute(&mut *tx)
            .await?;
    }
    let before: (i64, i64) = sqlx::query_as(
        "SELECT n_tup_upd, n_tup_hot_upd
        FROM pg_stat_xact_user_tables WHERE relid = 'hot_rows'::regclass",
    )
    .fetch_one(&mut *tx)
    .await?;
    sqlx::query("UPDATE hot_rows SET label = 'second' WHERE id = 1")
        .execute(&mut *tx)
        .await?;
    let after: (i64, i64) = sqlx::query_as(
        "SELECT n_tup_upd, n_tup_hot_upd
        FROM pg_stat_xact_user_tables WHERE relid = 'hot_rows'::regclass",
    )
    .fetch_one(&mut *tx)
    .await?;
    assert_eq!(before, (10, 10));
    assert_eq!(after, (11, 10));
    // article-example:end
    let stored: (i32, String) = sqlx::query_as("SELECT visits, label FROM hot_rows WHERE id = 1")
        .fetch_one(&mut *tx)
        .await?;
    assert_eq!(stored, (10, "second".into()));
    tx.commit().await?;
    println!("Current-transaction counters: {before:?} then {after:?}. No elapsed-time or index-size claim.");
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
