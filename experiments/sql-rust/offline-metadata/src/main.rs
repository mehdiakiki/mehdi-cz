// article:start query
#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let pool = sqlx::PgPool::connect(&std::env::var("DATABASE_URL")?).await?;
    let record = sqlx::query!("SELECT id FROM metadata_items")
        .fetch_one(&pool)
        .await?;
    let id: i32 = record.id;
    assert_eq!(id, 7);
    pool.close().await;
    Ok(())
}
// article:end query
