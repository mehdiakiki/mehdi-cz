use std::{collections::HashSet, io, time::{SystemTime, UNIX_EPOCH}};
pub type AnyResult<T> = Result<T, Box<dyn std::error::Error>>;
pub fn invalid(message: &str) -> io::Error { io::Error::new(io::ErrorKind::InvalidInput, message) }
pub fn fixture_permission() -> AnyResult<()> {
    if std::env::var("ALLOW_DB_FIXTURES").as_deref() != Ok("yes") {
        return Err(invalid("use a disposable database; set ALLOW_DB_FIXTURES=yes").into());
    }
    Ok(())
}
pub fn fixture_name() -> String {
    let suffix = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos() as u64;
    format!("RUST_DEMO_{suffix:016x}")
}
pub fn validate_batch(rows: &[(i32, i32)]) -> AnyResult<()> {
    if rows.is_empty() || rows.len() > 1000 { return Err(invalid("batch must contain 1..=1000 rows").into()); }
    let mut ids = HashSet::new();
    for &(id, quantity) in rows {
        if id <= 0 || quantity < 0 || !ids.insert(id) {
            return Err(invalid("invalid quantity, identifier, or duplicate in batch").into());
        }
    }
    Ok(())
}
pub fn exact_integer(text: &str) -> AnyResult<i128> {
    let digits = text.strip_prefix('-').unwrap_or(text);
    if digits.is_empty() || digits.len() > 38 || !digits.bytes().all(|c| c.is_ascii_digit()) {
        return Err(invalid("expected an integer with at most 38 decimal digits").into());
    }
    Ok(text.parse::<i128>()?)
}
#[cfg(feature = "sqlserver")]
pub type SqlClient = tiberius::Client<tokio_util::compat::Compat<tokio::net::TcpStream>>;
#[cfg(feature = "sqlserver")]
pub async fn sqlserver() -> AnyResult<SqlClient> {
    use tiberius::{AuthMethod, Config, EncryptionLevel};
    use tokio_util::compat::TokioAsyncWriteCompatExt;
    let mut config = Config::new();
    config.host(std::env::var("SQLSERVER_HOST")?);
    config.port(std::env::var("SQLSERVER_PORT").unwrap_or_else(|_| "1433".into()).parse()?);
    config.database(std::env::var("SQLSERVER_DATABASE")?);
    config.authentication(AuthMethod::sql_server(std::env::var("SQLSERVER_USER")?, std::env::var("SQLSERVER_PASSWORD")?));
    config.encryption(EncryptionLevel::Required);
    if let Ok(ca) = std::env::var("SQLSERVER_CA_FILE") { config.trust_cert_ca(ca); }
    let tcp = tokio::net::TcpStream::connect(config.get_addr()).await?;
    tcp.set_nodelay(true)?;
    let mut client = tiberius::Client::connect(config, tcp.compat_write()).await?;
    let row = client.query("SELECT CONVERT(varchar(64), SERVERPROPERTY('ProductVersion')) AS version", &[]).await?.into_row().await?.ok_or_else(|| invalid("no server version"))?;
    let version: &str = row.try_get("version")?.ok_or_else(|| invalid("null server version"))?;
    if version != std::env::var("SQLSERVER_EXPECT_VERSION")? { return Err(invalid("SQL Server version differs from the declared fixture pin").into()); }
    println!("SQL Server version={version}");
    Ok(client)
}
#[cfg(feature = "oracle-native")]
pub fn oracle_connection() -> AnyResult<oracle::Connection> {
    let conn = oracle::Connection::connect(std::env::var("ORACLE_USER")?, std::env::var("ORACLE_PASSWORD")?, std::env::var("ORACLE_CONNECT_STRING")?)?;
    conn.set_autocommit(false);
    conn.set_call_timeout(Some(std::time::Duration::from_secs(5)))?;
    let (version, _) = conn.server_version()?;
    if version.to_string() != std::env::var("ORACLE_EXPECT_VERSION")? { return Err(invalid("Oracle version differs from the declared fixture pin").into()); }
    println!("Oracle version={version}");
    Ok(conn)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn rejects_batches_before_streaming() {
        assert!(validate_batch(&[(1,2),(2,0)]).is_ok());
        for rows in [vec![],vec![(1,-1)],vec![(1,1),(1,2)],vec![(0,1)],vec![(1,1);1001]] { assert!(validate_batch(&rows).is_err()); }
    }
    #[test] fn integers_survive_beyond_i64_without_float() {
        let n = exact_integer("9223372036854775808").unwrap();
        assert!(i64::try_from(n).is_err());
        assert_eq!(n.to_string(),"9223372036854775808");
        assert_eq!(exact_integer("99999999999999999999999999999999999999").unwrap().to_string(),"99999999999999999999999999999999999999");
        for value in ["", "1.5", "1e3", "+1", " 1", "999999999999999999999999999999999999999"] { assert!(exact_integer(value).is_err()); }
    }
    #[test] fn generated_table_names_fit_oracle_legacy_length() {
        let name=fixture_name(); assert!(name.len()<=30); assert!(name.bytes().all(|c|c.is_ascii_alphanumeric()||c==b'_')); assert!(name.starts_with("RUST_DEMO_"));
    }
}
