use sql_rust_engines_b::{connect, number, Result};

// article-example:start
async fn compare(variable: &str) -> Result<()> {
    let mut c = connect(variable).await?;
    sqlx::query("DROP TABLE IF EXISTS b_json")
        .execute(&mut c)
        .await?;
    sqlx::query("CREATE TABLE b_json(id INT PRIMARY KEY, payload JSON NOT NULL) ENGINE=InnoDB")
        .execute(&mut c)
        .await?;
    let original = r#"{ "a":1, "a":2, "note":"é" }"#;
    sqlx::query("INSERT INTO b_json VALUES(1,?)")
        .bind(original)
        .execute(&mut c)
        .await?;
    let stored: String = sqlx::query_scalar("SELECT CAST(payload AS CHAR) FROM b_json WHERE id=1")
        .fetch_one(&mut c)
        .await?;
    let selected: String = sqlx::query_scalar(
        "SELECT JSON_UNQUOTE(JSON_EXTRACT(payload,'$.a')) FROM b_json WHERE id=1",
    )
    .fetch_one(&mut c)
    .await?;
    if variable == "MARIADB_URL" {
        assert_eq!(stored, original);
        assert_eq!(selected, "1");
    } else {
        assert_ne!(stored, original);
        assert_eq!(selected, "2");
    }
    sqlx::query("INSERT INTO b_json VALUES(2,?)")
        .bind(r#"{"n":null}"#)
        .execute(&mut c)
        .await?;
    let explicit: Option<String> =
        sqlx::query_scalar("SELECT JSON_TYPE(JSON_EXTRACT(payload,'$.n')) FROM b_json WHERE id=2")
            .fetch_one(&mut c)
            .await?;
    let missing: Option<String> = sqlx::query_scalar(
        "SELECT JSON_TYPE(JSON_EXTRACT(payload,'$.absent')) FROM b_json WHERE id=2",
    )
    .fetch_one(&mut c)
    .await?;
    assert_eq!(explicit.as_deref(), Some("NULL"));
    assert_eq!(missing, None);
    let rejected = sqlx::query("INSERT INTO b_json VALUES(3,?)")
        .bind("not json")
        .execute(&mut c)
        .await
        .unwrap_err();
    let expected = if variable == "MARIADB_URL" { 4025 } else { 3140 };
    assert_eq!(number(&rejected), Some(expected));
    let absent: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM b_json WHERE id=3")
        .fetch_one(&mut c)
        .await?;
    assert_eq!(absent, 0);
    println!("{variable}: stored={stored}; selected a={selected}; null and missing checked");
    Ok(())
}
// article-example:end

#[tokio::main]
async fn main() -> Result<()> {
    compare("MYSQL_URL").await?;
    compare("MARIADB_URL").await?;
    Ok(())
}
