use sha2::{Digest, Sha256};
use sqlx::PgPool;

pub fn verifier(token: &str) -> Vec<u8> {
    Sha256::digest(token.as_bytes()).to_vec()
}

// article:start check
pub async fn session_user(pool: &PgPool, token: &str) -> Result<Option<i64>, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT user_id FROM sessions
         WHERE token_hash = $1 AND revoked_at IS NULL
         AND expires_at > clock_timestamp()",
    )
    .bind(verifier(token))
    .fetch_optional(pool)
    .await
}
// article:end check

// article:start revoke
pub async fn revoke(pool: &PgPool, token: &str) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE sessions SET revoked_at = clock_timestamp()
         WHERE token_hash = $1 AND revoked_at IS NULL",
    )
    .bind(verifier(token))
    .execute(pool)
    .await?;
    Ok(())
}
// article:end revoke
