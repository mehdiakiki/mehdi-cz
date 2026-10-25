use sql_rust_enterprise_examples::{exact_integer, oracle_connection, AnyResult};
// article-example: number
fn main() -> AnyResult<()> {
    let conn = oracle_connection()?;
    for input in [
        "9223372036854775807",
        "9223372036854775808",
        "99999999999999999999999999999999999999",
    ] {
        let row = conn.query_row(
            "SELECT CAST(:1 AS NUMBER(38,0)), TO_CHAR(CAST(:1 AS NUMBER(38,0)), 'TM9', 'NLS_NUMERIC_CHARACTERS=''.,''') FROM dual",
            &[&input],
        )?;
        let narrowed: oracle::Result<i64> = row.get(0);
        let exact: String = row.get(1)?;
        assert_eq!(exact, input);
        let integer = exact_integer(&exact)?;
        assert_eq!(narrowed.is_ok(), i64::try_from(integer).is_ok());
        println!("exact={exact}, fits_i64={}", narrowed.is_ok());
    }
    Ok(())
}
// end-article-example
