use sql_rust_postgres_sqlite::{
    pg::{code, Fixture},
    Result,
};
use sqlx::PgPool;

#[derive(Debug, PartialEq)]
enum OldStatus {
    Pending,
    Paid,
}
// article-example:start
fn decode_old(value: &str) -> std::result::Result<OldStatus, String> {
    match value {
        "pending" => Ok(OldStatus::Pending),
        "paid" => Ok(OldStatus::Paid),
        other => Err(format!("unsupported order status: {other}")),
    }
}
// article-example:end

async fn check(pool: &PgPool) -> Result<()> {
    sqlx::raw_sql(
        "CREATE TYPE order_status AS ENUM ('pending', 'paid');
        CREATE TABLE orders (id integer PRIMARY KEY, status order_status NOT NULL);
        INSERT INTO orders VALUES (1, 'pending');",
    )
    .execute(pool)
    .await?;
    let mut too_early = pool.begin().await?;
    sqlx::query("ALTER TYPE order_status ADD VALUE 'processing'")
        .execute(&mut *too_early)
        .await?;
    let error = sqlx::query("INSERT INTO orders VALUES (2, 'processing')")
        .execute(&mut *too_early)
        .await
        .unwrap_err();
    assert_eq!(code(&error).as_deref(), Some("55P04"));
    too_early.rollback().await?;
    let mut migration = pool.begin().await?;
    sqlx::query("ALTER TYPE order_status ADD VALUE 'processing'")
        .execute(&mut *migration)
        .await?;
    migration.commit().await?;
    sqlx::query("INSERT INTO orders VALUES (2, 'processing')")
        .execute(pool)
        .await?;
    let values: Vec<String> = sqlx::query_scalar("SELECT status::text FROM orders ORDER BY id")
        .fetch_all(pool)
        .await?;
    assert_eq!(decode_old(&values[0]), Ok(OldStatus::Pending));
    assert_eq!(
        decode_old(&values[1]),
        Err("unsupported order status: processing".into())
    );
    let count: i64 =
        sqlx::query_scalar("SELECT count(*) FROM orders WHERE status::text = 'processing'")
            .fetch_one(pool)
            .await?;
    assert_eq!(count, 1);
    println!("Uncommitted enum value use rejected; committed migration allowed storage; unchanged old Rust decoder still rejected processing.");
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
