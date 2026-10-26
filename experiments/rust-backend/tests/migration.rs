use rust_backend_labs::{database, discard, migration::*};

#[tokio::test]
async fn expansion_accepts_old_writes_but_the_constraint_ends_that_compatibility() {
    let pool = database("backend_migration").await;
    sqlx::query("CREATE TABLE profiles (id integer PRIMARY KEY, full_name text NOT NULL)")
        .execute(&pool)
        .await
        .unwrap();
    old_insert(&pool, 1, "Before").await.unwrap();
    sqlx::query("ALTER TABLE profiles ADD COLUMN display_name text")
        .execute(&pool)
        .await
        .unwrap();
    old_insert(&pool, 2, "Old writer").await.unwrap();
    new_insert(&pool, 3, "New writer").await.unwrap();
    backfill_range(&pool, 1, 3).await.unwrap();
    // An old writer can still change the authoritative column after a backfill.
    sqlx::query("UPDATE profiles SET full_name = 'Changed by old' WHERE id = 2")
        .execute(&pool)
        .await
        .unwrap();
    let stale: (String, String) =
        sqlx::query_as("SELECT full_name, display_name FROM profiles WHERE id = 2")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(stale, ("Changed by old".into(), "Old writer".into()));
    println!("mixed writers: new column can be stale after an old update");
    // In the rollout, stop every old writer and close its rollback window here.
    assert_eq!(backfill_range(&pool, 1, 3).await.unwrap(), 1);
    assert_eq!(backfill_range(&pool, 1, 3).await.unwrap(), 0);
    sqlx::query("ALTER TABLE profiles ALTER COLUMN display_name SET NOT NULL")
        .execute(&pool)
        .await
        .unwrap();
    let error = old_insert(&pool, 4, "Retired writer").await.unwrap_err();
    assert_eq!(
        error.as_database_error().unwrap().code().as_deref(),
        Some("23502")
    );
    new_insert(&pool, 4, "Supported writer").await.unwrap();
    println!("after NOT NULL: old insert=23502 new insert=success");
    discard(pool, "backend_migration").await;
}
