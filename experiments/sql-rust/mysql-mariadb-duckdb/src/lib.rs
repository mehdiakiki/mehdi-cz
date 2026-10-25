pub type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

#[cfg(feature = "mysql")]
pub async fn connect(variable: &str) -> Result<sqlx::MySqlConnection> {
    use sqlx::{mysql::{MySqlConnectOptions, MySqlSslMode}, Connection};
    use std::str::FromStr;
    if std::env::var("SQL_RUST_DISPOSABLE").as_deref() != Ok("1") {
        return Err("fixtures require SQL_RUST_DISPOSABLE=1 and a disposable schema".into());
    }
    let url = std::env::var(variable)?;
    let mode = if std::env::var("SQL_RUST_ALLOW_PLAINTEXT_CI").as_deref() == Ok("1") {
        MySqlSslMode::Disabled
    } else {
        MySqlSslMode::VerifyIdentity
    };
    let options = MySqlConnectOptions::from_str(&url)?.ssl_mode(mode).charset("utf8mb4");
    let mut connection = sqlx::MySqlConnection::connect_with(&options).await?;
    let version: String = sqlx::query_scalar("SELECT VERSION()").fetch_one(&mut connection).await?;
    if variable == "MYSQL_URL" {
        assert!(version.starts_with("8.4.13"), "unexpected MySQL version: {version}");
        assert!(!version.contains("MariaDB"));
    } else {
        assert!(version.contains("11.4.13") && version.contains("MariaDB"), "unexpected MariaDB version: {version}");
    }
    println!("engine={version}; client=sqlx-0.9.0");
    sqlx::query("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'").execute(&mut connection).await?;
    sqlx::query("SET SESSION innodb_lock_wait_timeout = 2").execute(&mut connection).await?;
    sqlx::query("SET SESSION time_zone = '+00:00'").execute(&mut connection).await?;
    Ok(connection)
}

#[cfg(feature = "mysql")]
pub fn number(error: &sqlx::Error) -> Option<u16> {
    error.as_database_error()?.try_downcast_ref::<sqlx::mysql::MySqlDatabaseError>().map(|error| error.number())
}

#[cfg(feature = "duckdb")]
pub fn duck_version(connection: &duckdb::Connection) -> Result<()> {
    let version: String = connection.query_row("SELECT version()", [], |row| row.get(0))?;
    assert_eq!(version, "v2.0.0", "this fixture pins the linked engine as well as the Rust wrapper");
    println!("engine={version}; client=duckdb-1.20000.0");
    Ok(())
}

#[cfg(feature = "duckdb")]
pub fn literal(path: &std::path::Path) -> String {
    format!("'{}'", path.to_string_lossy().replace('\'', "''"))
}
