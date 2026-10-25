use sql_rust_postgres_sqlite::{
    pg::{code, Fixture},
    Result,
};
use sqlx::PgPool;

// article-example:start
async fn transfer(
    pool: &PgPool,
    request: &str,
    amount: i32,
) -> std::result::Result<bool, sqlx::Error> {
    if amount <= 0 {
        return Ok(false);
    }
    let mut tx = pool.begin().await?;
    let changed = sqlx::query(
        "UPDATE accounts SET balance = balance - $1
        WHERE id = 1 AND balance >= $1",
    )
    .bind(amount)
    .execute(&mut *tx)
    .await?
    .rows_affected();
    if changed != 1 {
        tx.rollback().await?;
        return Ok(false);
    }
    let credited = sqlx::query("UPDATE accounts SET balance = balance + $1 WHERE id = 2")
        .bind(amount)
        .execute(&mut *tx)
        .await?
        .rows_affected();
    if credited != 1 {
        tx.rollback().await?;
        return Ok(false);
    }
    sqlx::query("INSERT INTO transfers (request_key, amount) VALUES ($1, $2)")
        .bind(request)
        .bind(amount)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(true)
}
// article-example:end

async fn check(pool: &PgPool) -> Result<()> {
    sqlx::raw_sql("CREATE TABLE accounts (id integer PRIMARY KEY, balance integer NOT NULL CHECK (balance >= 0));
        CREATE TABLE transfers (request_key text PRIMARY KEY, amount integer NOT NULL CHECK (amount > 0));
        INSERT INTO accounts VALUES (1, 100), (2, 0);").execute(pool).await?;
    assert!(transfer(pool, "request-'one", 30).await?);
    assert!(!transfer(pool, "too-large", 200).await?);
    assert!(!transfer(pool, "negative", -1).await?);
    let duplicate = transfer(pool, "request-'one", 30).await.unwrap_err();
    assert_eq!(code(&duplicate).as_deref(), Some("23505"));
    let balances: Vec<i32> = sqlx::query_scalar("SELECT balance FROM accounts ORDER BY id")
        .fetch_all(pool)
        .await?;
    assert_eq!(balances, vec![70, 30]);
    assert_eq!(
        sqlx::query_scalar::<_, i64>("SELECT count(*) FROM transfers")
            .fetch_one(pool)
            .await?,
        1
    );
    let invalid = sqlx::query("UPDATE accounts SET balance = -1 WHERE id = 1")
        .execute(pool)
        .await
        .unwrap_err();
    assert_eq!(code(&invalid).as_deref(), Some("23514"));
    println!("Bound apostrophe remained data; committed transfer moved 30 once; failed duplicate rolled back both updates; constraints rejected invalid storage.");
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
