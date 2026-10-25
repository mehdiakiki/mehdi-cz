use sql_rust_enterprise_examples::{fixture_name, fixture_permission, invalid, sqlserver, validate_batch, AnyResult, SqlClient};
use tiberius::IntoRow;
// article-example: bulk
async fn send_batch(client: &mut SqlClient, table: &str, rows: &[(i32,i32)]) -> AnyResult<()> {
    validate_batch(rows)?;
    let mut request = client.bulk_insert(table).await?;
    for &(id, quantity) in rows {
        request.send((id, quantity).into_row()).await?;
    }
    let accepted = request.finalize().await?.total();
    assert_eq!(accepted, rows.len() as u64);
    Ok(())
}
// end-article-example
async fn count(client: &mut SqlClient, table: &str) -> AnyResult<i64> {
    let row=client.query(format!("SELECT COUNT_BIG(*) FROM {table}"), &[]).await?.into_row().await?.ok_or_else(||invalid("missing count"))?;
    Ok(row.try_get(0)?.ok_or_else(||invalid("null count"))?)
}
async fn run() -> AnyResult<()> {
    fixture_permission()?;
    let mut client=sqlserver().await?;
    let table=format!("dbo.{}",fixture_name());
    client.execute(format!("CREATE TABLE {table} (id int PRIMARY KEY, quantity int NOT NULL CHECK(quantity>=0))"),&[]).await?;
    let outcome=exercise(&mut client,&table).await;
    drop(client);
    let mut observer=sqlserver().await?;
    observer.execute(format!("DROP TABLE {table}"),&[]).await?;
    outcome
}
async fn exercise(client: &mut SqlClient, table: &str) -> AnyResult<()> {
    let rows=[(1,2),(2,0),(3,5)];
    client.execute("SET XACT_ABORT ON; BEGIN TRANSACTION",&[]).await?;
    send_batch(client,table,&rows).await?;
    assert_eq!(count(client,table).await?,3);
    client.execute("ROLLBACK",&[]).await?;
    assert_eq!(count(client,table).await?,0);
    client.execute("BEGIN TRANSACTION",&[]).await?;
    send_batch(client,table,&rows).await?;
    client.execute("COMMIT",&[]).await?;
    let mut observer=sqlserver().await?;
    assert_eq!(count(&mut observer,table).await?,3);
    assert!(validate_batch(&[(4,-1)]).is_err());
    let mut failing=sqlserver().await?;
    failing.execute("SET XACT_ABORT ON; BEGIN TRANSACTION",&[]).await?;
    let error=failing.execute(format!("INSERT INTO {table} VALUES (@P1,@P2)"),&[&4i32,&-1i32]).await.expect_err("database CHECK must reject negative quantity");
    assert_eq!(error.code(),Some(547));
    drop(failing);
    assert_eq!(count(&mut observer,table).await?,3);
    println!("bulk rollback=0; committed rows=3; rejected negative input added no row");
    Ok(())
}
#[tokio::main(flavor="current_thread")]
async fn main() -> AnyResult<()> { tokio::time::timeout(std::time::Duration::from_secs(30),run()).await? }
