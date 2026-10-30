use rusqlite::{Connection, ErrorCode, TransactionBehavior};
use std::{error::Error, time::Duration};

fn main() -> Result<(), Box<dyn Error>> {
    let directory = tempfile::tempdir()?;
    let path = directory.path().join("interactive.sqlite");
    let mut importer = Connection::open(&path)?;
    importer.pragma_update(None, "journal_mode", "WAL")?;
    importer.execute_batch(
        "CREATE TABLE imported (source_id INTEGER PRIMARY KEY);
         CREATE TABLE progress (input_id TEXT PRIMARY KEY, next_id INTEGER NOT NULL);
         INSERT INTO progress VALUES ('input-v1', 1);
         CREATE TABLE settings (id INTEGER PRIMARY KEY, value TEXT NOT NULL);
         INSERT INTO settings VALUES (1, 'before');",
    )?;
    let foreground = Connection::open(&path)?;
    foreground.busy_timeout(Duration::ZERO)?;
    let tx = importer.transaction_with_behavior(TransactionBehavior::Immediate)?;
    tx.execute("INSERT INTO imported VALUES (1), (2)", [])?;
    tx.execute("UPDATE progress SET next_id = 3 WHERE input_id = 'input-v1'", [])?;
    let busy = foreground.execute("UPDATE settings SET value = 'during' WHERE id = 1", []).unwrap_err();
    assert_eq!(busy.sqlite_error_code(), Some(ErrorCode::DatabaseBusy));
    tx.rollback()?;
    let count: i64 = foreground.query_row("SELECT count(*) FROM imported", [], |r| r.get(0))?;
    let next: i64 = foreground.query_row("SELECT next_id FROM progress", [], |r| r.get(0))?;
    assert_eq!((count, next), (0, 1));
    for (first, last) in [(1, 2), (3, 4)] {
        let tx = importer.transaction_with_behavior(TransactionBehavior::Immediate)?;
        for id in first..=last {
            tx.execute("INSERT INTO imported VALUES (?1)", [id])?;
        }
        tx.execute("UPDATE progress SET next_id = ?1 WHERE input_id = 'input-v1'", [last + 1])?;
        tx.commit()?;
        foreground.execute("UPDATE settings SET value = 'saved' WHERE id = 1", [])?;
        println!("committed batch={first}..={last}; foreground save=ok");
        if first == 1 {
            drop(importer);
            importer = Connection::open(&path)?;
            let checkpoint: i64 = importer.query_row("SELECT next_id FROM progress WHERE input_id = 'input-v1'", [], |r| r.get(0))?;
            assert_eq!(checkpoint, 3);
        }
    }
    let ids: Vec<i64> = foreground.prepare("SELECT source_id FROM imported ORDER BY source_id")?
        .query_map([], |r| r.get(0))?.collect::<rusqlite::Result<_>>()?;
    assert_eq!(ids, [1, 2, 3, 4]);
    let progress: i64 = foreground.query_row("SELECT next_id FROM progress", [], |r| r.get(0))?;
    assert_eq!(progress, 5);
    println!("held import=SQLITE_BUSY; rollback rows/progress=(0,1); reopened checkpoint=3; final rows=[1,2,3,4], checkpoint=5");
    Ok(())
}
