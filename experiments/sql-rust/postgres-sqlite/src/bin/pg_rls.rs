use sql_rust_postgres_sqlite::{
    pg::{code, Fixture},
    Result,
};
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::time::Duration;

async fn check(owner: &PgPool, schema: &str) -> Result<()> {
    let app_url = std::env::var("SQL_RUST_PG_APP_URL")
        .map_err(|_| "SQL_RUST_PG_APP_URL must use a separate non-owner application login")?;
    let app = PgPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&app_url)
        .await?;
    let app_name: String = sqlx::query_scalar("SELECT current_user::text")
        .fetch_one(&app)
        .await?;
    let owner_name: String = sqlx::query_scalar("SELECT current_user::text")
        .fetch_one(owner)
        .await?;
    assert_ne!(app_name, owner_name);
    let powers: (bool, bool) =
        sqlx::query_as("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user")
            .fetch_one(&app)
            .await?;
    assert_eq!(powers, (false, false));
    sqlx::raw_sql("CREATE TABLE documents (id integer PRIMARY KEY, tenant_id integer NOT NULL, body text NOT NULL);
        INSERT INTO documents VALUES (1, 7, 'Alice document'), (2, 8, 'Bob document');
        ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
        CREATE POLICY tenant_scope ON documents
          USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::integer)
          WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::integer);")
        .execute(owner).await?;
    let role = format!("\"{}\"", app_name.replace('"', "\"\""));
    sqlx::query(&format!("GRANT USAGE ON SCHEMA \"{schema}\" TO {role}"))
        .execute(owner)
        .await?;
    sqlx::query(&format!(
        "GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO {role}"
    ))
    .execute(owner)
    .await?;
    sqlx::query(&format!("SET search_path TO \"{schema}\""))
        .execute(&app)
        .await?;
    assert_eq!(
        sqlx::query_scalar::<_, i64>("SELECT count(*) FROM documents")
            .fetch_one(&app)
            .await?,
        0
    );
    // article-example:start
    let mut tx = app.begin().await?;
    sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
        .bind("7")
        .execute(&mut *tx)
        .await?;
    let visible: Vec<i32> = sqlx::query_scalar("SELECT id FROM documents ORDER BY id")
        .fetch_all(&mut *tx)
        .await?;
    assert_eq!(visible, vec![1]);
    tx.commit().await?;
    let after: i64 = sqlx::query_scalar("SELECT count(*) FROM documents")
        .fetch_one(&app)
        .await?;
    assert_eq!(after, 0);
    // article-example:end
    let mut tx = app.begin().await?;
    sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
        .bind("7")
        .execute(&mut *tx)
        .await?;
    let forbidden = sqlx::query("INSERT INTO documents VALUES (3, 8, 'wrong tenant')")
        .execute(&mut *tx)
        .await
        .unwrap_err();
    assert_eq!(code(&forbidden).as_deref(), Some("42501"));
    tx.rollback().await?;
    let mut tx = app.begin().await?;
    sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
        .bind("8")
        .execute(&mut *tx)
        .await?;
    assert_eq!(
        sqlx::query_scalar::<_, Vec<i32>>("SELECT array_agg(id ORDER BY id) FROM documents")
            .fetch_one(&mut *tx)
            .await?,
        vec![2]
    );
    tx.commit().await?;
    assert_eq!(
        sqlx::query_scalar::<_, i64>("SELECT count(*) FROM documents")
            .fetch_one(owner)
            .await?,
        2
    );
    app.close().await;
    println!("Separate non-owner role: missing tenant saw zero; tenant 7 saw row 1; pooled context reset; cross-tenant insert denied; tenant 8 saw row 2.");
    Ok(())
}
async fn run() -> Result<()> {
    let fixture = Fixture::new().await?;
    let outcome = check(&fixture.pool, &fixture.schema).await;
    fixture.finish(outcome).await
}
#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> {
    tokio::time::timeout(Duration::from_secs(30), run()).await?
}
#[tokio::test]
async fn integration() -> Result<()> {
    tokio::time::timeout(Duration::from_secs(30), run()).await?
}
