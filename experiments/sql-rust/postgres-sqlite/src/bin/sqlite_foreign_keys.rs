use rusqlite::{Connection, ErrorCode};
use sql_rust_postgres_sqlite::{sqlite_version, Result};
use std::path::Path;

// article-example:start
fn open_checked(path: &Path) -> rusqlite::Result<Connection> {
    let connection = Connection::open(path)?;
    connection.pragma_update(None, "foreign_keys", true)?;
    let enabled: i32 = connection.query_row("PRAGMA foreign_keys", [], |row| row.get(0))?;
    if enabled != 1 {
        return Err(rusqlite::Error::InvalidQuery);
    }
    Ok(connection)
}
// article-example:end

fn run() -> Result<()> {
    let directory = tempfile::tempdir()?;
    let path = directory.path().join("projects.sqlite");
    let unchecked = Connection::open(&path)?;
    sqlite_version(&unchecked)?;
    unchecked.pragma_update(None, "foreign_keys", false)?;
    unchecked.execute_batch(
        "CREATE TABLE projects (id INTEGER PRIMARY KEY);
        CREATE TABLE members (id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL
            REFERENCES projects(id) ON DELETE RESTRICT);
        CREATE TABLE tasks (id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL
            REFERENCES projects(id) ON DELETE CASCADE);",
    )?;
    let missing_project: i64 = 999;
    unchecked.execute(
        "INSERT INTO members VALUES (?1, ?2)",
        [1_i64, missing_project],
    )?;
    let safe = open_checked(&path)?;
    let violations = safe
        .prepare("PRAGMA foreign_key_check")?
        .query_map([], |_| Ok(()))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    assert_eq!(violations.len(), 1);
    safe.execute("DELETE FROM members WHERE id = 1", [])?;
    let error = safe
        .execute("INSERT INTO members VALUES (1, 999)", [])
        .unwrap_err();
    assert_eq!(
        error.sqlite_error_code(),
        Some(ErrorCode::ConstraintViolation)
    );
    safe.execute_batch(
        "INSERT INTO projects VALUES (1); INSERT INTO members VALUES (1, 1);
                       INSERT INTO tasks VALUES (1, 1);",
    )?;
    let restricted = safe
        .execute("DELETE FROM projects WHERE id = 1", [])
        .unwrap_err();
    assert_eq!(restricted.sqlite_error_code(), Some(ErrorCode::ConstraintViolation));
    for table in ["projects", "members", "tasks"] {
        let count: i64 = safe.query_row(&format!("SELECT count(*) FROM {table}"), [], |r| r.get(0))?;
        assert_eq!(count, 1);
    }
    safe.execute("DELETE FROM members WHERE id = 1", [])?;
    safe.execute("DELETE FROM projects WHERE id = 1", [])?;
    assert_eq!(
        safe.query_row("SELECT count(*) FROM tasks", [], |r| r.get::<_, i64>(0))?,
        0
    );
    drop(safe);
    let reopened = open_checked(&path)?;
    let orphan = reopened
        .execute("INSERT INTO tasks VALUES (2, 999)", [])
        .unwrap_err();
    assert_eq!(orphan.sqlite_error_code(), Some(ErrorCode::ConstraintViolation));
    unchecked.execute_batch("BEGIN")?;
    unchecked.pragma_update(None, "foreign_keys", true)?;
    assert_eq!(
        unchecked.query_row("PRAGMA foreign_keys", [], |r| r.get::<_, i32>(0))?,
        0
    );
    unchecked.execute_batch("ROLLBACK")?;
    println!("Unchecked connection stored an orphan; check found it; checked connections rejected new orphans and enforced RESTRICT/CASCADE.");
    Ok(())
}
fn main() -> Result<()> {
    run()
}
#[test]
fn contract() -> Result<()> {
    run()
}
