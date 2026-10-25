use duckdb::{params, Connection};
use sql_rust_engines_b::{duck_version, Result};

// article-example:start
fn report(c: &Connection, path: &str) -> duckdb::Result<Vec<(String, i64)>> {
    let mut query = c.prepare("SELECT team, CAST(SUM(cents) AS BIGINT) AS total_cents FROM read_csv(?, header=true, columns={'team':'VARCHAR','cents':'BIGINT'}) GROUP BY team ORDER BY team")?;
    let rows = query.query_map(params![path], |row| Ok((row.get(0)?, row.get(1)?)))?;
    rows.collect()
}
// article-example:end

fn main() -> Result<()> {
    let files = tempfile::tempdir()?;
    let good = files.path().join("expenses.csv");
    let bad = files.path().join("bad.csv");
    std::fs::write(&good, "team,cents\nops,100\nsupport,50\nops,200\n")?;
    std::fs::write(&bad, "team,cents\nops,oops\n")?;
    let c = Connection::open_in_memory()?;
    duck_version(&c)?;
    let totals = report(&c, good.to_str().ok_or("non-UTF8 temporary path")?)?;
    assert_eq!(
        totals,
        vec![("ops".to_owned(), 300), ("support".to_owned(), 50)]
    );
    assert!(report(&c, bad.to_str().ok_or("non-UTF8 temporary path")?).is_err());
    println!("typed totals={totals:?}; invalid numeric CSV rejected");
    Ok(())
}
