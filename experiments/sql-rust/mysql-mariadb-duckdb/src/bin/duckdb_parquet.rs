use duckdb::{params, Connection};
use sql_rust_engines_b::{duck_version, literal, Result};

// article-example:start
fn query_file(c: &Connection, path: &str) -> Result<()> {
    let mut explain = c.prepare("EXPLAIN SELECT id FROM read_parquet(?) WHERE id>=8000 AND id<8010")?;
    for row in explain.query_map(params![path], |row| row.get::<_, String>(1))? {
        println!("actual plan:\n{}", row?);
    }
    let (count, total): (i64, i64) = c.query_row("SELECT COUNT(*), CAST(SUM(id) AS BIGINT) FROM read_parquet(?) WHERE id>=8000 AND id<8010", params![path], |row| Ok((row.get(0)?, row.get(1)?)))?;
    assert_eq!(count, 10);
    assert_eq!(total, (8000..8010_i64).sum::<i64>());
    let groups: i64 = c.query_row("SELECT COUNT(DISTINCT row_group_id) FROM parquet_metadata(?)", params![path], |row| row.get(0))?;
    assert!(groups > 1, "fixture needs more than one row group");
    println!("checked selected rows={count}, sum={total}, file row groups={groups}; plan is not a byte-read measurement");
    Ok(())
}
// article-example:end

fn main() -> Result<()> {
    let files = tempfile::tempdir()?;
    let parquet = files.path().join("events.parquet");
    let c = Connection::open_in_memory()?;
    duck_version(&c)?;
    c.execute_batch("SET threads=1; SET memory_limit='128MB'; SET max_execution_time=15000;")?;
    c.execute_batch(&format!("COPY (SELECT i::BIGINT AS id, (i%2)::INTEGER AS region, repeat('x',256) AS payload FROM range(10000) t(i)) TO {} (FORMAT PARQUET, ROW_GROUP_SIZE 2048)", literal(&parquet)))?;
    query_file(&c, parquet.to_str().ok_or("non-UTF8 temporary path")?)
}
