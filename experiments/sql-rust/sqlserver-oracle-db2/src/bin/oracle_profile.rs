use sql_rust_enterprise_examples::{
    fixture_name, fixture_permission, oracle_connection, AnyResult,
};
fn main() -> AnyResult<()> {
    fixture_permission()?;
    let conn = oracle_connection()?;
    let table = fixture_name();
    conn.execute(
        &format!("CREATE TABLE {table} (id NUMBER(9) PRIMARY KEY, note VARCHAR2(40))"),
        &[],
    )?;
    let result = exercise(&conn, &table);
    let cleanup = conn.execute(&format!("DROP TABLE {table} PURGE"), &[]);
    result?;
    cleanup?;
    Ok(())
}
// article-example: oracle-profile
fn exercise(conn: &oracle::Connection, table: &str) -> AnyResult<()> {
    let id = 7i32;
    let note: Option<String> = None;
    conn.execute(
        &format!("INSERT INTO {table} (id, note) VALUES (:1, :2)"),
        &[&id, &note],
    )?;
    conn.commit()?;
    let observer = oracle_connection()?;
    let row = observer.query_row(
        &format!("SELECT id, note FROM {table} WHERE id = :1"),
        &[&id],
    )?;
    let actual_id: i32 = row.get(0)?;
    let actual_note: Option<String> = row.get(1)?;
    assert_eq!((actual_id, actual_note), (id, None));
    conn.execute(
        &format!("UPDATE {table} SET note = :1 WHERE id = :2"),
        &[&"changed", &id],
    )?;
    conn.rollback()?;
    let row = observer.query_row(&format!("SELECT note FROM {table} WHERE id = :1"), &[&id])?;
    assert_eq!(row.get::<_, Option<String>>(0)?, None);
    println!("committed insert visible; rolled-back note unchanged");
    Ok(())
}
// end-article-example
