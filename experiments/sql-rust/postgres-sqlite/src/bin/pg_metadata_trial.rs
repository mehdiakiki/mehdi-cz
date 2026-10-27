use sql_rust_postgres_sqlite::{pg::Fixture, Result};
use std::{path::Path, process::Command};

fn cargo(project: &Path, url: &str, offline: bool, action: &str) -> Result<std::process::Output> {
    let mut command = Command::new("cargo");
    command.current_dir(project).args([action, "--locked"])
        .env("DATABASE_URL", url)
        .env("SQLX_OFFLINE", if offline { "true" } else { "false" })
        .env("SQLX_OFFLINE_DIR", project.join(".sqlx"));
    // Force macro expansion again, even when Cargo could reuse an earlier successful artifact.
    let source = project.join("src/main.rs");
    let text = std::fs::read_to_string(&source)?;
    std::fs::write(&source, text)?;
    Ok(command.output()?)
}
async fn run() -> Result<()> {
    assert_eq!(std::env::var("GITHUB_ACTIONS").as_deref(), Ok("true"));
    let fixture = Fixture::new().await?;
    let outcome = async {
        let project = Path::new(env!("CARGO_MANIFEST_DIR")).join("../offline-metadata").canonicalize()?;
        std::fs::create_dir_all(project.join(".sqlx"))?;
        let original_url = std::env::var("SQL_RUST_PG_URL")?;
        let separator = if original_url.contains('?') { '&' } else { '?' };
        let url = format!("{original_url}{separator}options=-csearch_path%3D{}", fixture.schema);
        sqlx::raw_sql("CREATE TABLE metadata_items(id integer PRIMARY KEY); INSERT INTO metadata_items VALUES (7)")
            .execute(&fixture.pool).await?;
        let baseline = cargo(&project, &url, false, "check")?;
        assert!(baseline.status.success(), "{}", String::from_utf8_lossy(&baseline.stderr));
        let metadata = std::fs::read_dir(project.join(".sqlx"))?
            .collect::<std::io::Result<Vec<_>>>()?;
        assert_eq!(metadata.len(), 1);
        let cached = std::fs::read(metadata[0].path())?;
        assert!(cargo(&project, &url, true, "run")?.status.success());
        sqlx::query("ALTER TABLE metadata_items ALTER COLUMN id TYPE bigint")
            .execute(&fixture.pool).await?;
        let stale = cargo(&project, &url, true, "check")?;
        assert!(stale.status.success(), "stale offline metadata still describes int4");
        let runtime = cargo(&project, &url, true, "run")?;
        assert!(!runtime.status.success());
        let runtime_error = String::from_utf8_lossy(&runtime.stderr);
        assert!(runtime_error.contains("ColumnDecode") && runtime_error.contains("INT8"), "{runtime_error}");
        let live = cargo(&project, &url, false, "check")?;
        assert!(!live.status.success());
        let live_error = String::from_utf8_lossy(&live.stderr);
        assert!(live_error.contains("expected `i32`, found `i64`"), "{live_error}");
        assert_ne!(cached, std::fs::read(metadata[0].path())?);
        println!("int4 baseline ran; after bigint migration stale offline check passed, stale executable failed with ColumnDecode/INT8, live check failed with i32/i64 and refreshed metadata differed.");
        println!("Runtime failure: {runtime_error}\nLive compile failure: {live_error}");
        Ok(())
    }.await;
    fixture.finish(outcome).await
}
#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> { run().await }
