use sql_rust_enterprise_examples::{
    fixture_name, fixture_permission, invalid, sqlserver, AnyResult,
};
async fn run() -> AnyResult<()> {
    fixture_permission()?;
    let mut writer = sqlserver().await?;
    let table = format!("dbo.{}", fixture_name());
    writer
        .execute(
            format!("CREATE TABLE {table} (id int PRIMARY KEY, quantity int NOT NULL)"),
            &[],
        )
        .await?;
    writer
        .execute(format!("INSERT INTO {table} VALUES (1,10)"), &[])
        .await?;
    let result = exercise(&mut writer, &table).await;
    let mut cleanup = sqlserver().await?;
    drop(writer);
    cleanup.execute(format!("DROP TABLE {table}"), &[]).await?;
    result
}
// article-example: blocking
async fn exercise(
    writer: &mut sql_rust_enterprise_examples::SqlClient,
    table: &str,
) -> AnyResult<()> {
    let mut reader = sqlserver().await?;
    let settings = reader
        .query(
            "SELECT is_read_committed_snapshot_on FROM sys.databases WHERE database_id=DB_ID()",
            &[],
        )
        .await?
        .into_row()
        .await?
        .ok_or_else(|| invalid("no database setting"))?;
    let rcsi: bool = settings
        .try_get(0)?
        .ok_or_else(|| invalid("null RCSI setting"))?;
    assert_eq!(
        u8::from(rcsi).to_string(),
        std::env::var("SQLSERVER_EXPECT_RCSI")?
    );
    writer.execute("BEGIN TRANSACTION", &[]).await?;
    writer
        .execute(format!("UPDATE {table} SET quantity=11 WHERE id=1"), &[])
        .await?;
    reader
        .execute(
            "SET TRANSACTION ISOLATION LEVEL READ COMMITTED; SET LOCK_TIMEOUT 1000",
            &[],
        )
        .await?;
    let locked = async {
        let stream = reader
            .query(
                format!("SELECT quantity FROM {table} WITH (READCOMMITTEDLOCK) WHERE id=1"),
                &[],
            )
            .await?;
        stream.into_row().await
    }
    .await;
    match locked {
        Err(error) => assert_eq!(error.code(), Some(1222)),
        Ok(_) => return Err(invalid("expected a lock timeout").into()),
    }
    drop(reader);
    let mut reader = sqlserver().await?;
    reader
        .execute(
            "SET TRANSACTION ISOLATION LEVEL READ COMMITTED; SET LOCK_TIMEOUT 1000",
            &[],
        )
        .await?;
    let read = async {
        let stream = reader
            .query(format!("SELECT quantity FROM {table} WHERE id=1"), &[])
            .await?;
        stream.into_row().await
    }
    .await;
    match read {
        Ok(Some(row)) if rcsi => {
            assert_eq!(row.try_get::<i32, _>(0)?, Some(10));
        }
        Err(error) if !rcsi => assert_eq!(error.code(), Some(1222)),
        _ => return Err(invalid("READ COMMITTED result disagrees with declared RCSI mode").into()),
    }
    writer.execute("ROLLBACK", &[]).await?;
    println!("RCSI={rcsi}; explicit locking waited; plain read matched the configured mode");
    Ok(())
}
// end-article-example
#[tokio::main(flavor = "current_thread")]
async fn main() -> AnyResult<()> {
    tokio::time::timeout(std::time::Duration::from_secs(30), run()).await?
}
