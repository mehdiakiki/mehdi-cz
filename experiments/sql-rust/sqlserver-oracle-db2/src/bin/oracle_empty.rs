use sql_rust_enterprise_examples::{oracle_connection, AnyResult};
// article-example: empty
fn main() -> AnyResult<()> {
    let conn = oracle_connection()?;
    for (input, expected) in [
        (None, None),
        (Some(""), None),
        (Some(" "), Some(" ")),
        (Some("Ana"), Some("Ana")),
    ] {
        let row = conn.query_row("SELECT CAST(:1 AS VARCHAR2(20)) FROM dual", &[&input])?;
        let actual: Option<String> = row.get(0)?;
        assert_eq!(actual.as_deref(), expected);
        println!("input={input:?}, returned={actual:?}");
    }
    Ok(())
}
// end-article-example
