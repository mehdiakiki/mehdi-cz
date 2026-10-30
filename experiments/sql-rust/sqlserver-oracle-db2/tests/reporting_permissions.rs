#![cfg(feature = "sqlserver")]
use sql_rust_enterprise_examples::{AnyResult, SqlClient};
use tiberius::{AuthMethod, Config, EncryptionLevel};
use tokio_util::compat::TokioAsyncWriteCompatExt;

async fn connect(user: &str, password: &str, database: &str) -> AnyResult<SqlClient> {
    let mut config = Config::new();
    config.host("localhost");
    config.port(1433);
    config.database(database);
    config.authentication(AuthMethod::sql_server(user, password));
    config.encryption(EncryptionLevel::Required);
    // Only the disposable loopback CI service uses a self-signed certificate.
    config.trust_cert();
    let socket = tokio::net::TcpStream::connect(config.get_addr()).await?;
    socket.set_nodelay(true)?;
    Ok(tiberius::Client::connect(config, socket.compat_write()).await?)
}

fn assert_update_permission_denied(error: &tiberius::error::Error) {
    assert_eq!(error.code(), Some(229));
}

#[tokio::test]
async fn reporting_login_reads_approved_data_and_cannot_modify_it() -> AnyResult<()> {
    let password = std::env::var("SQLSERVER_CI_SA_PASSWORD")?;
    let mut admin = connect("sa", &password, "master").await?;
    admin
        .simple_query("CREATE DATABASE practical_reporting;")
        .await?
        .into_results()
        .await?;
    admin
        .simple_query(
            "CREATE LOGIN practical_reporter WITH PASSWORD = 'Disposable-report-only-42!';",
        )
        .await?
        .into_results()
        .await?;
    admin
        .simple_query(
            "USE practical_reporting;
        CREATE USER practical_reporter FOR LOGIN practical_reporter;
        CREATE TABLE reporting_permission_probe (id integer PRIMARY KEY, value integer NOT NULL);
        INSERT INTO reporting_permission_probe VALUES (1,7);
        CREATE TABLE private_probe (secret integer NOT NULL);
        INSERT INTO private_probe VALUES (42);
        GRANT SELECT ON reporting_permission_probe TO practical_reporter;
        DENY UPDATE, INSERT, DELETE ON reporting_permission_probe TO practical_reporter;",
        )
        .await?
        .into_results()
        .await?;
    let version = admin
        .query(
            "SELECT CONVERT(varchar(64), SERVERPROPERTY('ProductVersion'))",
            &[],
        )
        .await?
        .into_row()
        .await?
        .unwrap();
    let version: &str = version.try_get(0)?.unwrap();
    println!("SQLSERVER_PERMISSION_VERSION={version}");
    assert!(version.starts_with("16."));
    let mut client = connect(
        "practical_reporter",
        "Disposable-report-only-42!",
        "practical_reporting",
    )
    .await?;
    let allowed = client
        .query(
            "SELECT value FROM reporting_permission_probe WHERE id = @P1",
            &[&1_i32],
        )
        .await?
        .into_row()
        .await?
        .unwrap();
    assert_eq!(allowed.try_get::<i32, _>(0)?, Some(7));
    let error = client
        .execute(
            "UPDATE reporting_permission_probe SET value = @P1 WHERE id = @P2",
            &[&9_i32, &1_i32],
        )
        .await
        .expect_err("reporter must not update");
    assert_update_permission_denied(&error);
    for command in [
        "INSERT INTO reporting_permission_probe VALUES (2,9)",
        "DELETE FROM reporting_permission_probe WHERE id = 1",
    ] {
        assert_eq!(
            client.execute(command, &[]).await.unwrap_err().code(),
            Some(229)
        );
    }
    let error = match client.query("SELECT secret FROM private_probe", &[]).await {
        Ok(stream) => stream
            .into_results()
            .await
            .expect_err("private table was readable"),
        Err(error) => error,
    };
    assert_eq!(error.code(), Some(229));
    let stored = admin
        .query(
            "SELECT value FROM reporting_permission_probe WHERE id = 1",
            &[],
        )
        .await?
        .into_row()
        .await?
        .unwrap();
    assert_eq!(stored.try_get::<i32, _>(0)?, Some(7));
    println!("SQLSERVER_REPORTING: real login read=7; UPDATE/INSERT/DELETE/private SELECT=229; independent stored value=7");
    drop(client);
    admin.simple_query("USE master; ALTER DATABASE practical_reporting SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE practical_reporting; DROP LOGIN practical_reporter;").await?.into_results().await?;
    Ok(())
}
