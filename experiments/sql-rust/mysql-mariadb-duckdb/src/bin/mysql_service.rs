use sql_rust_engines_b::{connect, number, Result};
use sqlx::{Connection, MySqlConnection};

// article-example:start
async fn reserve(
    connection: &mut MySqlConnection,
    order: &str,
    units: i32,
) -> std::result::Result<bool, sqlx::Error> {
    assert!(units > 0);
    let mut tx = connection.begin().await?;
    let changed =
        sqlx::query("UPDATE b_stock SET available = available - ? WHERE id = 1 AND available >= ?")
            .bind(units)
            .bind(units)
            .execute(&mut *tx)
            .await?
            .rows_affected();
    if changed != 1 {
        tx.rollback().await?;
        return Ok(false);
    }
    if let Err(error) = sqlx::query("INSERT INTO b_orders(order_key, units) VALUES (?, ?)")
        .bind(order)
        .bind(units)
        .execute(&mut *tx)
        .await
    {
        tx.rollback().await?;
        return Err(error);
    }
    tx.commit().await?;
    Ok(true)
}
// article-example:end

#[tokio::main]
async fn main() -> Result<()> {
    let mut c = connect("MYSQL_URL").await?;
    sqlx::query("DROP TABLE IF EXISTS b_orders")
        .execute(&mut c)
        .await?;
    sqlx::query("DROP TABLE IF EXISTS b_stock")
        .execute(&mut c)
        .await?;
    sqlx::query("CREATE TABLE b_stock(id INT PRIMARY KEY, available INT NOT NULL CHECK (available >= 0)) ENGINE=InnoDB").execute(&mut c).await?;
    sqlx::query("CREATE TABLE b_orders(order_key VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY, units INT NOT NULL CHECK(units > 0)) ENGINE=InnoDB").execute(&mut c).await?;
    sqlx::query("INSERT INTO b_stock VALUES(1,3)")
        .execute(&mut c)
        .await?;
    assert!(reserve(&mut c, "order-1", 2).await?);
    assert!(!reserve(&mut c, "order-2", 2).await?);
    let duplicate = reserve(&mut c, "order-1", 1).await.unwrap_err();
    assert_eq!(number(&duplicate), Some(1062));
    let left: i32 = sqlx::query_scalar("SELECT available FROM b_stock WHERE id=1")
        .fetch_one(&mut c)
        .await?;
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM b_orders")
        .fetch_one(&mut c)
        .await?;
    assert_eq!((left, count), (1, 1));
    println!("committed reservation, rejected shortage, duplicate rollback: available={left}, orders={count}");
    Ok(())
}
