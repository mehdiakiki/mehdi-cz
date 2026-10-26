use rust_backend_labs::{database, discard, uploads::*};

#[tokio::test]
async fn durable_cleanup_survives_a_dropped_request_without_deleting_ready_files() {
    let pool = database("backend_uploads").await;
    let directory = tempfile::tempdir().unwrap();
    sqlx::query("CREATE TABLE uploads (id bigint PRIMARY KEY, object_key text UNIQUE NOT NULL, state text NOT NULL)").execute(&pool).await.unwrap();
    sqlx::query("CREATE TABLE attachments (id bigint PRIMARY KEY REFERENCES uploads(id), object_key text NOT NULL)").execute(&pool).await.unwrap();
    for id in [1_i64, 2, 3] {
        let key = format!("generated-{id}");
        sqlx::query("INSERT INTO uploads VALUES ($1, $2, 'stored')").bind(id).bind(&key).execute(&pool).await.unwrap();
        std::fs::write(directory.path().join(key), b"fixture bytes").unwrap();
    }
    assert!(cancel(&pool, 1).await.unwrap());
    // Drop all request-owned objects. A new worker reads the durable cleanup state.
    let request_state = pool.clone();
    drop(request_state);
    assert!(cleanup(&pool, directory.path(), 1).await.unwrap());
    assert!(!directory.path().join("generated-1").exists());
    assert!(!cleanup(&pool, directory.path(), 1).await.unwrap());
    assert!(publish(&pool, 2).await.unwrap());
    assert!(!cancel(&pool, 2).await.unwrap());
    assert!(!cleanup(&pool, directory.path(), 2).await.unwrap());
    assert!(directory.path().join("generated-2").exists());
    // Simulate deletion succeeding but the process stopping before recording it.
    assert!(cancel(&pool, 3).await.unwrap());
    std::fs::remove_file(directory.path().join("generated-3")).unwrap();
    assert!(cleanup(&pool, directory.path(), 3).await.unwrap());
    assert!(!publish(&pool, 3).await.unwrap());
    let visible: Vec<i64> = sqlx::query_scalar("SELECT id FROM attachments ORDER BY id").fetch_all(&pool).await.unwrap();
    assert_eq!(visible, vec![2]);
    println!("cancelled file removed; ready file retained; repeated delete recovered; visible attachments=[2]");
    discard(pool, "backend_uploads").await;
}
