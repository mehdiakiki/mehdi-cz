use sql_rust_engines_b::{connect, number, Result};
use sqlx::{Connection, MySqlConnection, Row};

// article-example:start
async fn shared_contract(c: &mut MySqlConnection) -> Result<()> {
    sqlx::query("DROP TABLE IF EXISTS b_contract")
        .execute(&mut *c)
        .await?;
    sqlx::query("CREATE TABLE b_contract(id BIGINT PRIMARY KEY, label VARCHAR(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL, note TEXT NULL, quantity INT NOT NULL CHECK(quantity >= 0)) ENGINE=InnoDB").execute(&mut *c).await?;
    sqlx::query("INSERT INTO b_contract VALUES(?, ?, ?, ?)")
        .bind(1_i64)
        .bind("café 🦆")
        .bind(Option::<String>::None)
        .bind(3_i32)
        .execute(&mut *c)
        .await?;
    let row = sqlx::query("SELECT label, note FROM b_contract WHERE id=?")
        .bind(1_i64)
        .fetch_one(&mut *c)
        .await?;
    assert_eq!(row.try_get::<String, _>("label")?, "café 🦆");
    assert_eq!(row.try_get::<Option<String>, _>("note")?, None);
    let mut tx = c.begin().await?;
    sqlx::query("UPDATE b_contract SET quantity=2 WHERE id=1")
        .execute(&mut *tx)
        .await?;
    tx.rollback().await?;
    let quantity: i32 = sqlx::query_scalar("SELECT quantity FROM b_contract WHERE id=1")
        .fetch_one(&mut *c)
        .await?;
    assert_eq!(quantity, 3);
    assert!(sqlx::query("UPDATE b_contract SET quantity=-1 WHERE id=1")
        .execute(&mut *c)
        .await
        .is_err());
    Ok(())
}
// article-example:end

#[tokio::main]
async fn main() -> Result<()> {
    for variable in ["MYSQL_URL", "MARIADB_URL"] {
        let mut c = connect(variable).await?;
        shared_contract(&mut c).await?;
        let duplicate = sqlx::query("INSERT INTO b_contract VALUES(1,'duplicate',NULL,0)")
            .execute(&mut c)
            .await
            .unwrap_err();
        assert_eq!(number(&duplicate), Some(1062));
        let returned = sqlx::query_scalar::<_, i64>(
            "INSERT INTO b_contract VALUES(2,'returning',NULL,0) RETURNING id",
        )
        .fetch_one(&mut c)
        .await;
        if variable == "MARIADB_URL" {
            assert_eq!(returned?, 2);
        } else {
            assert_eq!(number(&returned.unwrap_err()), Some(1064));
        }
        println!("{variable}: shared data contract passed; INSERT RETURNING capability checked separately");
    }
    Ok(())
}
