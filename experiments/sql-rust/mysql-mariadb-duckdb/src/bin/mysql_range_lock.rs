use sql_rust_engines_b::{connect, number, Result};
use sqlx::{Connection, MySqlConnection};

// article-example:start
async fn range_case(
    a: &mut MySqlConnection,
    b: &mut MySqlConnection,
    committed: bool,
) -> Result<()> {
    let isolation = if committed {
        "READ COMMITTED"
    } else {
        "REPEATABLE READ"
    };
    let statement: &'static str = if committed {
        "SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED"
    } else {
        "SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ"
    };
    sqlx::query(statement)
    .execute(&mut *a)
    .await?;
    let mut reader = a.begin().await?;
    let ids: Vec<i32> = sqlx::query_scalar(
        "SELECT id FROM b_range FORCE INDEX(by_k) WHERE k>=10 AND k<20 FOR UPDATE",
    )
    .fetch_all(&mut *reader)
    .await?;
    assert_eq!(ids, vec![1]);
    let mut writer = b.begin().await?;
    let insert = sqlx::query("INSERT INTO b_range(id,k) VALUES(3,15)")
        .execute(&mut *writer)
        .await;
    if committed {
        insert?;
        writer.commit().await?;
    } else {
        assert_eq!(number(&insert.unwrap_err()), Some(1205));
        writer.rollback().await?;
    }
    reader.commit().await?;
    if !committed {
        sqlx::query("INSERT INTO b_range(id,k) VALUES(3,15)")
            .execute(&mut *b)
            .await?;
    }
    let present: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM b_range WHERE id=3 AND k=15")
        .fetch_one(&mut *b)
        .await?;
    assert_eq!(present, 1);
    sqlx::query("DELETE FROM b_range WHERE id=3")
        .execute(&mut *b)
        .await?;
    println!("{isolation}: checked insert result while locking read remained open");
    Ok(())
}
// article-example:end

#[tokio::main]
async fn main() -> Result<()> {
    let mut a = connect("MYSQL_URL").await?;
    let mut b = connect("MYSQL_URL").await?;
    sqlx::query("SET SESSION innodb_lock_wait_timeout=1")
        .execute(&mut b)
        .await?;
    sqlx::query("DROP TABLE IF EXISTS b_range")
        .execute(&mut a)
        .await?;
    sqlx::query(
        "CREATE TABLE b_range(id INT PRIMARY KEY, k INT NOT NULL, KEY by_k(k)) ENGINE=InnoDB",
    )
    .execute(&mut a)
    .await?;
    sqlx::query("INSERT INTO b_range VALUES(1,10),(2,20)")
        .execute(&mut a)
        .await?;
    tokio::time::timeout(std::time::Duration::from_secs(8), async {
        range_case(&mut a, &mut b, false).await?;
        range_case(&mut a, &mut b, true).await
    })
    .await??;
    Ok(())
}
