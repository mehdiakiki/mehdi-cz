use sql_rust_postgres_sqlite::{pg::{code, Fixture}, Result};
use sqlx::PgPool;
use std::time::Duration;

async fn attempt(pool: &PgPool, provoke_conflict: bool, reads: &mut Vec<i32>) -> std::result::Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;
    let body: std::result::Result<(), sqlx::Error> = async {
        sqlx::query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE").execute(&mut *tx).await?;
        let value: i32 = sqlx::query_scalar("SELECT value FROM counter WHERE id = 1").fetch_one(&mut *tx).await?;
        reads.push(value);
        if provoke_conflict {
            // Harness coordination: a different pooled connection commits after
            // this snapshot's read and before its attempted write.
            sqlx::query("UPDATE counter SET value = value + 1 WHERE id = 1").execute(pool).await?;
        }
        sqlx::query("UPDATE counter SET value = $1 WHERE id = 1").bind(value + 1).execute(&mut *tx).await?;
        Ok(())
    }.await;
    match body {
        Ok(()) => tx.commit().await,
        Err(error) => { tx.rollback().await?; Err(error) },
    }
}

// article-example:start
async fn increment_with_retry(pool: &PgPool, reads: &mut Vec<i32>) -> std::result::Result<usize, sqlx::Error> {
    for number in 0..3 {
        match attempt(pool, number == 0, reads).await {
            Ok(()) => return Ok(number + 1),
            Err(error) if code(&error).as_deref() == Some("40001") && number < 2 => {
                tokio::time::sleep(Duration::from_millis(10)).await;
            }
            Err(error) => return Err(error),
        }
    }
    unreachable!("each final attempt returns")
}
// article-example:end

async fn check(pool: &PgPool) -> Result<()> {
    sqlx::raw_sql("CREATE TABLE counter (id integer PRIMARY KEY, value integer NOT NULL);
                   INSERT INTO counter VALUES (1, 0);").execute(pool).await?;
    let mut reads = Vec::new();
    assert_eq!(increment_with_retry(pool, &mut reads).await?, 2);
    assert_eq!(reads, vec![0, 1]);
    assert_eq!(sqlx::query_scalar::<_, i32>("SELECT value FROM counter WHERE id = 1").fetch_one(pool).await?, 2);
    println!("Forced first attempt lost its snapshot; second attempt reread 1 and committed 2. Exactly two attempts.");
    Ok(())
}
async fn run() -> Result<()> { let fixture = Fixture::new().await?; let outcome = check(&fixture.pool).await; fixture.finish(outcome).await }
#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> { tokio::time::timeout(Duration::from_secs(30), run()).await? }
#[tokio::test]
async fn integration() -> Result<()> { tokio::time::timeout(Duration::from_secs(30), run()).await? }
