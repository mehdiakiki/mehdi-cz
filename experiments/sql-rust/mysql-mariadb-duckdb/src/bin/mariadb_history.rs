use sql_rust_engines_b::{connect, Result};
use sqlx::Row;

// article-example:start
async fn history(c: &mut sqlx::MySqlConnection) -> Result<()> {
    sqlx::query("INSERT INTO b_history(id,title) VALUES(1,'draft')").execute(&mut *c).await?;
    sqlx::query("UPDATE b_history SET title='approved' WHERE id=1").execute(&mut *c).await?;
    let current: String = sqlx::query_scalar("SELECT title FROM b_history WHERE id=1").fetch_one(&mut *c).await?;
    assert_eq!(current, "approved");
    sqlx::query("DELETE FROM b_history WHERE id=1").execute(&mut *c).await?;
    let current_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM b_history WHERE id=1").fetch_one(&mut *c).await?;
    assert_eq!(current_count, 0);
    let rows = sqlx::query("SELECT title, CAST(ROW_START AS CHAR) AS started, CAST(ROW_END AS CHAR) AS ended FROM b_history FOR SYSTEM_TIME ALL WHERE id=1 ORDER BY ROW_START")
        .fetch_all(&mut *c).await?;
    let mut titles = Vec::new();
    for row in rows {
        let title: String = row.try_get("title")?;
        let start: String = row.try_get("started")?;
        let end: String = row.try_get("ended")?;
        println!("historical value={title}, system interval=[{start},{end})");
        titles.push(title);
    }
    titles.sort();
    assert_eq!(titles, vec!["approved".to_owned(), "draft".to_owned()]);
    Ok(())
}
// article-example:end

#[tokio::main]
async fn main() -> Result<()> {
    let mut c = connect("MARIADB_URL").await?;
    sqlx::query("DROP TABLE IF EXISTS b_history").execute(&mut c).await?;
    sqlx::query("CREATE TABLE b_history(id INT PRIMARY KEY, title VARCHAR(80) NOT NULL) ENGINE=InnoDB WITH SYSTEM VERSIONING").execute(&mut c).await?;
    history(&mut c).await
}
