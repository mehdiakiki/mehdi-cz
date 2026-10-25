use rusqlite::{Connection, ErrorCode, TransactionBehavior};
use sql_rust_postgres_sqlite::{sqlite_version, Result};
use std::time::Duration;

fn run() -> Result<()> {
    let directory = tempfile::tempdir()?;
    let path = directory.path().join("counter.sqlite");
    let mut first = Connection::open(&path)?;
    sqlite_version(&first)?;
    let mode: String = first.query_row("PRAGMA journal_mode = WAL", [], |r| r.get(0))?;
    assert_eq!(mode, "wal");
    first.execute_batch("CREATE TABLE counter (id INTEGER PRIMARY KEY, value INTEGER NOT NULL);
                         INSERT INTO counter VALUES (1, 0);")?;
    let mut second = Connection::open(&path)?;
    second.busy_timeout(Duration::from_millis(40))?;
    // article-example:start
    let writer = first.transaction_with_behavior(TransactionBehavior::Immediate)?;
    writer.execute("UPDATE counter SET value = value + 1 WHERE id = 1", [])?;
    let visible: i32 = second.query_row("SELECT value FROM counter WHERE id = 1", [], |r| r.get(0))?;
    assert_eq!(visible, 0);
    let error = second.execute("UPDATE counter SET value = value + 1 WHERE id = 1", []).unwrap_err();
    assert_eq!(error.sqlite_error_code(), Some(ErrorCode::DatabaseBusy));
    writer.commit()?;
    second.execute("UPDATE counter SET value = value + 1 WHERE id = 1", [])?;
    // article-example:end
    assert_eq!(second.query_row("SELECT value FROM counter", [], |r| r.get::<_, i32>(0))?, 2);
    let old_read = second.transaction()?;
    assert_eq!(old_read.query_row("SELECT value FROM counter", [], |r| r.get::<_, i32>(0))?, 2);
    first.execute("UPDATE counter SET value = 3 WHERE id = 1", [])?;
    let stale = old_read.execute("UPDATE counter SET value = value + 1 WHERE id = 1", []).unwrap_err();
    assert_eq!(stale.sqlite_error().unwrap().extended_code, rusqlite::ffi::SQLITE_BUSY_SNAPSHOT);
    old_read.rollback()?;
    second.execute("UPDATE counter SET value = value + 1 WHERE id = 1", [])?;
    assert_eq!(second.query_row("SELECT value FROM counter", [], |r| r.get::<_, i32>(0))?, 4);
    println!("WAL allowed the old committed read, not a second writer. Restarting the stale read transaction allowed the final update.");
    Ok(())
}
fn main() -> Result<()> { run() }
#[test]
fn contract() -> Result<()> { run() }
