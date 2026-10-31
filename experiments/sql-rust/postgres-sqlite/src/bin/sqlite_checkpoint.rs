use rusqlite::Connection;
use sql_rust_postgres_sqlite::{sqlite_version, Result};
use std::time::Duration;

fn passive(connection: &Connection) -> rusqlite::Result<(i32, i32, i32)> {
    // article:passive-checkpoint:start
    let progress: (i32, i32, i32) =
        connection.query_row("PRAGMA wal_checkpoint(PASSIVE)", [], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })?;
    // article:passive-checkpoint:end
    Ok(progress)
}

fn truncate(connection: &Connection) -> rusqlite::Result<(i32, i32, i32)> {
    connection.query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |row| {
        Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    })
}

fn run() -> Result<()> {
    let directory = tempfile::tempdir()?;
    let path = directory.path().join("checkpoint.sqlite");
    let wal_path = directory.path().join("checkpoint.sqlite-wal");
    let writer = Connection::open(&path)?;
    sqlite_version(&writer)?;
    writer.busy_timeout(Duration::ZERO)?;
    let mode: String = writer.query_row("PRAGMA journal_mode = WAL", [], |row| row.get(0))?;
    assert_eq!(mode, "wal");
    writer.execute_batch(
        "PRAGMA wal_autocheckpoint = 0;
         CREATE TABLE counter (id INTEGER PRIMARY KEY, value INTEGER NOT NULL);
         INSERT INTO counter VALUES (1, 0);",
    )?;
    let mut reader = Connection::open(&path)?;
    reader.busy_timeout(Duration::ZERO)?;
    let snapshot = reader.transaction()?;
    let before: i64 = snapshot.query_row("SELECT value FROM counter", [], |row| row.get(0))?;
    assert_eq!(before, 0);

    for value in 1..=12 {
        writer.execute("UPDATE counter SET value = ?1 WHERE id = 1", [value])?;
    }
    let first = passive(&writer)?;
    assert_eq!(first.0, 0, "PASSIVE can return success without finishing");
    assert!(first.1 > first.2, "reader pins an earlier end mark");
    let bytes_held = std::fs::metadata(&wal_path)?.len();
    assert!(bytes_held > 0);
    let blocked = truncate(&writer)?;
    assert_eq!(blocked.0, 1, "TRUNCATE cannot finish while this reader remains");

    // A smaller automatic-checkpoint threshold cannot invalidate the reader's snapshot.
    writer.execute_batch("PRAGMA wal_autocheckpoint = 1;")?;
    writer.execute("UPDATE counter SET value = 13 WHERE id = 1", [])?;
    let lower_threshold = passive(&writer)?;
    assert_eq!(lower_threshold.0, 0);
    assert!(lower_threshold.1 > lower_threshold.2);
    assert!(lower_threshold.1 > first.1, "commits continue growing the logical WAL");
    let still_old: i64 = snapshot.query_row("SELECT value FROM counter", [], |row| row.get(0))?;
    assert_eq!(still_old, 0);
    let latest: i64 = writer.query_row("SELECT value FROM counter", [], |row| row.get(0))?;
    assert_eq!(latest, 13);

    // End the snapshot only after recording both the incomplete and blocked checkpoints.
    snapshot.rollback()?;
    let finished = truncate(&writer)?;
    assert_eq!(finished, (0, 0, 0));
    assert_eq!(std::fs::metadata(&wal_path)?.len(), 0);
    let fresh: i64 = reader.query_row("SELECT value FROM counter", [], |row| row.get(0))?;
    assert_eq!(fresh, 13);
    println!(
        "CHECKPOINT: held PASSIVE={first:?}; held TRUNCATE={blocked:?}; \
         threshold=1 PASSIVE={lower_threshold:?}; held WAL bytes={bytes_held}; \
         old reader=0, writer=13; released TRUNCATE={finished:?}, WAL bytes=0, fresh reader={fresh}"
    );
    Ok(())
}

fn main() -> Result<()> {
    run()
}

#[test]
fn a_held_reader_limits_checkpoint_progress_until_its_snapshot_ends() -> Result<()> {
    run()
}
