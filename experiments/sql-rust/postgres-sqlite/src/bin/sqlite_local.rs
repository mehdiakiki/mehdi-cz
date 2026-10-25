use rusqlite::Connection;
use sql_rust_postgres_sqlite::{sqlite_version, Result};

fn migrate(connection: &mut Connection) -> rusqlite::Result<()> {
    let tx = connection.transaction()?;
    let version: i32 = tx.query_row("PRAGMA user_version", [], |r| r.get(0))?;
    match version {
        0 => tx.execute_batch(
            "CREATE TABLE notes (
            id INTEGER PRIMARY KEY, title TEXT NOT NULL,
            done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1))
        ); PRAGMA user_version = 1;",
        )?,
        1 => {}
        _ => return Err(rusqlite::Error::InvalidQuery),
    }
    tx.commit()
}

fn run() -> Result<()> {
    let directory = tempfile::tempdir()?;
    let path = directory.path().join("notes.sqlite");
    {
        let mut connection = Connection::open(&path)?;
        sqlite_version(&connection)?;
        migrate(&mut connection)?;
        // article-example:start
        let tx = connection.transaction()?;
        tx.execute(
            "INSERT INTO notes (title) VALUES (?1)",
            ["Sam's travel notes"],
        )?;
        tx.execute("UPDATE notes SET done = 1 WHERE id = ?1", [1])?;
        tx.commit()?;
        // article-example:end
        let tx = connection.transaction()?;
        tx.execute(
            "INSERT INTO notes (title) VALUES (?1)",
            ["discard this draft"],
        )?;
        tx.rollback()?;
    }
    let mut reopened = Connection::open(&path)?;
    migrate(&mut reopened)?;
    let row: (String, i32) =
        reopened.query_row("SELECT title, done FROM notes WHERE id = ?1", [1], |r| {
            Ok((r.get(0)?, r.get(1)?))
        })?;
    assert_eq!(row, ("Sam's travel notes".into(), 1));
    assert_eq!(
        reopened.query_row("SELECT count(*) FROM notes", [], |r| r.get::<_, i64>(0))?,
        1
    );
    assert!(reopened
        .execute("UPDATE notes SET done = 2 WHERE id = 1", [])
        .is_err());
    println!("Committed note survived connection close/reopen; rollback left one row; CHECK rejected done=2.");
    Ok(())
}
fn main() -> Result<()> {
    run()
}
#[test]
fn contract() -> Result<()> {
    run()
}
