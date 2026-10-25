pub type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

pub fn sqlite_version(connection: &rusqlite::Connection) -> Result<()> {
    let version: String = connection.query_row("SELECT sqlite_version()", [], |r| r.get(0))?;
    let source: String = connection.query_row("SELECT sqlite_source_id()", [], |r| r.get(0))?;
    assert_eq!(version, rusqlite::version());
    println!("SQLite {version}; source {source}; pinned libsqlite3-sys 0.39.1");
    Ok(())
}

#[cfg(feature = "postgres-integration")]
pub mod pg {
    use sqlx::{postgres::PgPoolOptions, PgPool};
    use std::time::{Duration, SystemTime, UNIX_EPOCH};
    use super::Result;

    pub struct Fixture {
        pub pool: PgPool,
        pub schema: String,
    }
    impl Fixture {
        pub async fn new() -> Result<Self> {
            let url = std::env::var("SQL_RUST_PG_URL")
                .map_err(|_| "SQL_RUST_PG_URL must name a disposable PostgreSQL 18 database")?;
            let nonce = SystemTime::now().duration_since(UNIX_EPOCH)?.as_nanos();
            let schema = format!("sqlrust_a_{}_{nonce}", std::process::id());
            let path = format!("SET search_path TO \"{schema}\"");
            let pool = PgPoolOptions::new().max_connections(4)
                .acquire_timeout(Duration::from_secs(5))
                .after_connect(move |connection, _| {
                    let path = path.clone();
                    Box::pin(async move {
                        sqlx::query(&path).execute(&mut *connection).await?;
                        sqlx::query("SET statement_timeout = '3s'").execute(&mut *connection).await?;
                        sqlx::query("SET lock_timeout = '1s'").execute(&mut *connection).await?;
                        sqlx::query("SET idle_in_transaction_session_timeout = '8s'").execute(&mut *connection).await?;
                        Ok(())
                    })
                }).connect(&url).await?;
            let version: i32 = sqlx::query_scalar("SELECT current_setting('server_version_num')::integer")
                .fetch_one(&pool).await?;
            assert_eq!(version / 10000, 18, "fixture targets PostgreSQL 18");
            if let Ok(expected) = std::env::var("SQL_RUST_PG_EXPECT_VERSION_NUM") {
                assert_eq!(version, expected.parse::<i32>()?);
            }
            println!("PostgreSQL server_version_num={version}");
            sqlx::query(&format!("CREATE SCHEMA \"{schema}\"")).execute(&pool).await?;
            Ok(Self { pool, schema })
        }
        pub async fn finish(self, outcome: Result<()>) -> Result<()> {
            let cleanup = sqlx::query(&format!("DROP SCHEMA \"{}\" CASCADE", self.schema))
                .execute(&self.pool).await;
            self.pool.close().await;
            outcome?;
            cleanup?;
            Ok(())
        }
    }
    pub fn code(error: &sqlx::Error) -> Option<String> {
        error.as_database_error()?.code().map(|code| code.into_owned())
    }
}
