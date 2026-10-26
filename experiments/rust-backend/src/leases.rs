use sqlx::PgPool;

// article:start claim
pub async fn claim(pool: &PgPool, job: i64, owner: &str) -> Result<Option<i64>, sqlx::Error> {
    sqlx::query_scalar(
        "UPDATE jobs SET owner = $2, epoch = epoch + 1,
             lease_until = clock_timestamp() + interval '1 minute', state = 'running'
         WHERE id = $1 AND state <> 'done'
             AND (lease_until IS NULL OR lease_until <= clock_timestamp())
         RETURNING epoch",
    )
    .bind(job)
    .bind(owner)
    .fetch_optional(pool)
    .await
}
// article:end claim

// article:start finish
pub async fn finish(pool: &PgPool, job: i64, epoch: i64, value: &str) -> Result<u64, sqlx::Error> {
    Ok(sqlx::query(
        "WITH accepted AS (
             UPDATE jobs SET state = 'done'
             WHERE id = $1 AND epoch = $2 AND state = 'running'
                 AND lease_until > clock_timestamp()
             RETURNING id
         )
         INSERT INTO effects (job_id, value)
         SELECT id, $3 FROM accepted
         ON CONFLICT (job_id) DO UPDATE SET value = EXCLUDED.value",
    )
    .bind(job)
    .bind(epoch)
    .bind(value)
    .execute(pool)
    .await?
    .rows_affected())
}
// article:end finish
