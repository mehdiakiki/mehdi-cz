use odbc_api::{buffers::TextRowSet, ConnectionOptions, Cursor, Environment};
use sql_rust_enterprise_examples::{invalid, AnyResult};
// article-example: db2
fn main() -> AnyResult<()> {
    let environment = Environment::new()?;
    let mut connection = environment.connect(
        &std::env::var("DB2_DSN")?, &std::env::var("DB2_USER")?,
        &std::env::var("DB2_PASSWORD")?, ConnectionOptions::default(),
    )?;
    {
        let mut cursor = connection.execute("SELECT SERVICE_LEVEL FROM TABLE(SYSPROC.ENV_GET_INST_INFO()) AS info", (), Some(5))?.ok_or_else(|| invalid("no server version cursor"))?;
        let mut row = cursor.next_row()?.ok_or_else(|| invalid("no server version row"))?;
        let mut bytes = Vec::new();
        if !row.get_text(1, &mut bytes)? { return Err(invalid("null Db2 service level").into()); }
        let version = std::str::from_utf8(&bytes)?.trim();
        if version != std::env::var("DB2_EXPECT_SERVICE_LEVEL")? { return Err(invalid("Db2 service level differs from the declared fixture pin").into()); }
        println!("Db2 service level={version}");
    }
    let id = 42i32;
    let mut cursor = connection.execute(
        "VALUES (CAST(? AS INTEGER), CAST(NULL AS VARCHAR(40)), CAST('ready' AS VARCHAR(40)))",
        &id, Some(5),
    )?.ok_or_else(|| invalid("expected a result cursor"))?;
    let buffers = TextRowSet::for_cursor(4, &mut cursor, Some(64))?;
    let mut cursor = cursor.bind_buffer(buffers)?;
    let mut rows = 0;
    while let Some(batch) = cursor.fetch_with_truncation_check(true)? {
        for index in 0..batch.num_rows() {
            let actual_id = std::str::from_utf8(batch.at(0, index).ok_or_else(|| invalid("null id"))?)?;
            assert_eq!(actual_id, "42");
            assert_eq!(batch.at(1, index), None);
            assert_eq!(batch.at(2, index), Some(&b"ready"[..]));
            rows += 1;
        }
    }
    assert_eq!(rows, 1);
    println!("one bound row; NULL distinct from text; no truncation");
    Ok(())
}
// end-article-example
