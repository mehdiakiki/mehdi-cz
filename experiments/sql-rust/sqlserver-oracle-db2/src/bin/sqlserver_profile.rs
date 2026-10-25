use sql_rust_enterprise_examples::{invalid, sqlserver, AnyResult};
// article-example: profile
async fn run() -> AnyResult<()> {
    let mut client = sqlserver().await?;
    let account_id = 42i32;
    let row = client
        .query(
            "SELECT CAST(@P1 AS int) AS account_id, CAST(NULL AS nvarchar(40)) AS note",
            &[&account_id],
        )
        .await?
        .into_row()
        .await?
        .ok_or_else(|| invalid("expected one row"))?;
    let actual: i32 = row
        .try_get("account_id")?
        .ok_or_else(|| invalid("account_id is null"))?;
    let note: Option<&str> = row.try_get("note")?;
    assert_eq!(actual, account_id);
    assert_eq!(note, None);
    println!("bound account_id={actual}, note={note:?}");
    Ok(())
}
// end-article-example
#[tokio::main(flavor = "current_thread")]
async fn main() -> AnyResult<()> {
    tokio::time::timeout(std::time::Duration::from_secs(20), run()).await?
}
