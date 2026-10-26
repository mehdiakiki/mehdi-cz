use sqlx::PgPool;

pub async fn old_insert(pool: &PgPool, id: i32, name: &str) -> Result<(), sqlx::Error> {
    sqlx::query("INSERT INTO profiles (id, full_name) VALUES ($1, $2)")
        .bind(id)
        .bind(name)
        .execute(pool)
        .await?;
    Ok(())
}

// article:start dualwrite
pub async fn new_insert(pool: &PgPool, id: i32, name: &str) -> Result<(), sqlx::Error> {
    sqlx::query("INSERT INTO profiles (id, full_name, display_name) VALUES ($1, $2, $2)")
        .bind(id)
        .bind(name)
        .execute(pool)
        .await?;
    Ok(())
}
// article:end dualwrite

// article:start dualupdate
pub async fn new_update(pool: &PgPool, id: i32, name: &str) -> Result<u64, sqlx::Error> {
    Ok(
        sqlx::query("UPDATE profiles SET full_name = $2, display_name = $2 WHERE id = $1")
            .bind(id)
            .bind(name)
            .execute(pool)
            .await?
            .rows_affected(),
    )
}
// article:end dualupdate

// article:start backfill
pub async fn backfill_range(pool: &PgPool, first: i32, last: i32) -> Result<u64, sqlx::Error> {
    Ok(sqlx::query(
        "UPDATE profiles SET display_name = full_name
         WHERE id >= $1 AND id <= $2
         AND display_name IS DISTINCT FROM full_name",
    )
    .bind(first)
    .bind(last)
    .execute(pool)
    .await?
    .rows_affected())
}
// article:end backfill
