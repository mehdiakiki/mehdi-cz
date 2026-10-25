use sql_rust_engines_b::{connect, Result};
use sqlx::Row;

// article-example:start
async fn inspect(c: &mut sqlx::MySqlConnection, table: &str) -> Result<()> {
    let (plan_sql, count_sql) = match table {
        "b_pk_small" => ("EXPLAIN SELECT id FROM b_pk_small FORCE INDEX (by_status) WHERE status = ?", "SELECT COUNT(*) FROM b_pk_small WHERE status = ?"),
        "b_pk_wide" => ("EXPLAIN SELECT id FROM b_pk_wide FORCE INDEX (by_status) WHERE status = ?", "SELECT COUNT(*) FROM b_pk_wide WHERE status = ?"),
        _ => return Err("unknown fixture table".into()),
    };
    for row in sqlx::query(plan_sql).bind(1_i32).fetch_all(&mut *c).await? {
        let key: Option<String> = row.try_get("key")?;
        let extra: Option<String> = row.try_get("Extra")?;
        println!("{table}: key={key:?}, extra={extra:?}");
    }
    let count: i64 = sqlx::query_scalar(count_sql)
        .bind(1_i32)
        .fetch_one(&mut *c)
        .await?;
    assert_eq!(count, 50);
    Ok(())
}
// article-example:end

#[tokio::main]
async fn main() -> Result<()> {
    let mut c = connect("MYSQL_URL").await?;
    for statement in ["DROP TABLE IF EXISTS b_pk_small", "DROP TABLE IF EXISTS b_pk_wide"] {
        sqlx::query(statement)
            .execute(&mut c)
            .await?;
    }
    sqlx::query("CREATE TABLE b_pk_small(id BIGINT PRIMARY KEY, status INT NOT NULL, KEY by_status(status)) ENGINE=InnoDB").execute(&mut c).await?;
    sqlx::query("CREATE TABLE b_pk_wide(id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY, status INT NOT NULL, KEY by_status(status)) ENGINE=InnoDB").execute(&mut c).await?;
    for id in 0..100_i64 {
        sqlx::query("INSERT INTO b_pk_small VALUES(?,?)")
            .bind(id)
            .bind((id % 2) as i32)
            .execute(&mut c)
            .await?;
        let text = format!("00000000-0000-0000-0000-{id:012}");
        sqlx::query("INSERT INTO b_pk_wide VALUES(?,?)")
            .bind(text)
            .bind((id % 2) as i32)
            .execute(&mut c)
            .await?;
    }
    inspect(&mut c, "b_pk_small").await?;
    inspect(&mut c, "b_pk_wide").await?;
    for row in sqlx::query("SELECT TABLE_NAME, INDEX_LENGTH FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('b_pk_small','b_pk_wide') ORDER BY TABLE_NAME").fetch_all(&mut c).await? {
        let table: String = row.try_get("TABLE_NAME")?;
        let bytes: Option<u64> = row.try_get("INDEX_LENGTH")?;
        println!("allocation observation, not payload measurement: {table} index_length={bytes:?}");
    }
    Ok(())
}
