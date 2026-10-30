use rust_backend_labs::{database, discard, leases::*};

#[tokio::test]
async fn an_expired_worker_cannot_overwrite_the_new_owner() {
    let pool = database("backend_leases").await;
    sqlx::query("CREATE TABLE jobs (id bigint PRIMARY KEY, owner text, epoch bigint NOT NULL DEFAULT 0, lease_until timestamptz, state text NOT NULL DEFAULT 'pending')").execute(&pool).await.unwrap();
    sqlx::query(
        "CREATE TABLE effects (job_id bigint PRIMARY KEY REFERENCES jobs(id), value text NOT NULL)",
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query("INSERT INTO jobs (id) VALUES (1)")
        .execute(&pool)
        .await
        .unwrap();
    let old = claim(&pool, 1, "A").await.unwrap().unwrap();
    assert_eq!(claim(&pool, 1, "B").await.unwrap(), None);
    // Force the expiry boundary rather than making the test sleep for a minute.
    sqlx::query(
        "UPDATE jobs SET lease_until = clock_timestamp() - interval '1 second' WHERE id = 1",
    )
    .execute(&pool)
    .await
    .unwrap();
    assert_eq!(finish(&pool, 1, old, "expired").await.unwrap(), 0);
    assert!(!renew(&pool, 1, old).await.unwrap());
    let new = claim(&pool, 1, "B").await.unwrap().unwrap();
    assert!(new > old);
    assert!(!renew(&pool, 1, old).await.unwrap());
    assert!(renew(&pool, 1, new).await.unwrap());
    assert_eq!(finish(&pool, 1, old, "stale").await.unwrap(), 0);
    assert_eq!(finish(&pool, 1, new, "from B").await.unwrap(), 1);
    assert_eq!(finish(&pool, 1, old, "late A").await.unwrap(), 0);
    assert_eq!(finish(&pool, 1, new, "duplicate B").await.unwrap(), 0);
    assert!(!renew(&pool, 1, new).await.unwrap());
    let value: String = sqlx::query_scalar("SELECT value FROM effects WHERE job_id = 1")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(value, "from B");
    println!("epochs: A={old} B={new}; stale affected=0; B affected=1; stored=from B");
    discard(pool, "backend_leases").await;
}
