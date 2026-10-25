use sql_rust_engines_b::{connect, number, Result};

// article-example:start
async fn names(c: &mut sqlx::MySqlConnection) -> Result<()> {
    let first = "résumé";
    let second = "resume";
    assert_ne!(first, second);
    sqlx::query("INSERT INTO b_names_folded(name) VALUES(?)").bind(first).execute(&mut *c).await?;
    let collision = sqlx::query("INSERT INTO b_names_folded(name) VALUES(?)").bind(second).execute(&mut *c).await.unwrap_err();
    assert_eq!(number(&collision), Some(1062));
    let composed = "é";
    let decomposed = "e\u{301}";
    assert_ne!(composed.as_bytes(), decomposed.as_bytes());
    for value in [composed, decomposed] {
        sqlx::query("INSERT INTO b_names_bytes(name) VALUES(?)").bind(value.as_bytes()).execute(&mut *c).await?;
    }
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM b_names_bytes").fetch_one(&mut *c).await?;
    assert_eq!(count, 2);
    Ok(())
}
// article-example:end

#[tokio::main]
async fn main() -> Result<()> {
    let mut c = connect("MYSQL_URL").await?;
    for table in ["b_names_folded", "b_names_bytes"] { sqlx::query(&format!("DROP TABLE IF EXISTS {table}")).execute(&mut c).await?; }
    sqlx::query("CREATE TABLE b_names_folded(name VARCHAR(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL UNIQUE) ENGINE=InnoDB").execute(&mut c).await?;
    sqlx::query("CREATE TABLE b_names_bytes(name VARBINARY(320) PRIMARY KEY) ENGINE=InnoDB").execute(&mut c).await?;
    names(&mut c).await?;
    let padding: String = sqlx::query_scalar("SELECT PAD_ATTRIBUTE FROM information_schema.COLLATIONS WHERE COLLATION_NAME='utf8mb4_0900_ai_ci'").fetch_one(&mut c).await?;
    println!("checked accent-insensitive collision and byte identity; selected collation pad attribute={padding}");
    Ok(())
}
