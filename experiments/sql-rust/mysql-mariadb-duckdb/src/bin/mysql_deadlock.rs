use sql_rust_engines_b::{connect, number, Result};
use sqlx::{Connection, MySqlConnection};
use std::{sync::Arc, time::Duration};
use tokio::sync::Barrier;

async fn pair(
    c: &mut MySqlConnection,
    first: i32,
    second: i32,
    gate: Option<Arc<Barrier>>,
) -> std::result::Result<(), sqlx::Error> {
    let mut tx = c.begin().await?;
    sqlx::query("UPDATE b_deadlock SET hits=hits+1 WHERE id=?")
        .bind(first)
        .execute(&mut *tx)
        .await?;
    if let Some(gate) = gate {
        gate.wait().await;
    }
    if let Err(error) = sqlx::query("UPDATE b_deadlock SET hits=hits+1 WHERE id=?")
        .bind(second)
        .execute(&mut *tx)
        .await
    {
        tx.rollback().await?;
        return Err(error);
    }
    tx.commit().await
}

// article-example:start
async fn ordered_with_retry(c: &mut MySqlConnection) -> std::result::Result<(), sqlx::Error> {
    for attempt in 0..3_u32 {
        match pair(c, 1, 2, None).await {
            Ok(()) => return Ok(()),
            Err(error) if number(&error) == Some(1213) && attempt < 2 => {
                tokio::time::sleep(Duration::from_millis(10 * u64::from(attempt + 1))).await;
            }
            Err(error) => return Err(error),
        }
    }
    unreachable!("the final attempt always returns")
}
// article-example:end

#[tokio::main]
async fn main() -> Result<()> {
    let mut a = connect("MYSQL_URL").await?;
    let mut b = connect("MYSQL_URL").await?;
    let detect: i64 = sqlx::query_scalar("SELECT @@innodb_deadlock_detect")
        .fetch_one(&mut a)
        .await?;
    if detect != 1 {
        return Err("fixture needs innodb_deadlock_detect=ON".into());
    }
    sqlx::query("DROP TABLE IF EXISTS b_deadlock")
        .execute(&mut a)
        .await?;
    sqlx::query("CREATE TABLE b_deadlock(id INT PRIMARY KEY, hits INT NOT NULL) ENGINE=InnoDB")
        .execute(&mut a)
        .await?;
    sqlx::query("INSERT INTO b_deadlock VALUES(1,0),(2,0)")
        .execute(&mut a)
        .await?;
    let gate = Arc::new(Barrier::new(2));
    let (left, right) = tokio::time::timeout(Duration::from_secs(8), async {
        tokio::join!(
            pair(&mut a, 1, 2, Some(gate.clone())),
            pair(&mut b, 2, 1, Some(gate))
        )
    })
    .await?;
    assert_eq!(usize::from(left.is_ok()) + usize::from(right.is_ok()), 1);
    let victim = if let Err(error) = left {
        error
    } else {
        right.unwrap_err()
    };
    assert_eq!(number(&victim), Some(1213));
    ordered_with_retry(&mut a).await?;
    let values: Vec<i32> = sqlx::query_scalar("SELECT hits FROM b_deadlock ORDER BY id")
        .fetch_all(&mut a)
        .await?;
    assert_eq!(values, vec![2, 2]);
    let (left, right) = tokio::time::timeout(Duration::from_secs(8), async {
        tokio::join!(ordered_with_retry(&mut a), ordered_with_retry(&mut b))
    })
    .await?;
    left?;
    right?;
    let values: Vec<i32> = sqlx::query_scalar("SELECT hits FROM b_deadlock ORDER BY id")
        .fetch_all(&mut a)
        .await?;
    assert_eq!(values, vec![4, 4]);
    println!("coordinated opposite-order victim=1213; bounded whole-transaction recovery and ordered requests checked");
    Ok(())
}
