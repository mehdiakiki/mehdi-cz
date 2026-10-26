pub mod errors;
pub mod middleware;
pub mod migration;
pub mod sessions;
pub mod uploads;
pub mod leases;

pub async fn database(schema: &'static str) -> sqlx::PgPool {
    let url = std::env::var("SQL_RUST_PG_URL").expect("Use the PostgreSQL GitHub job");
    let admin = sqlx::PgPool::connect(&url).await.unwrap();
    // schema is a fixed test constant, never a request parameter.
    sqlx::query(&format!("CREATE SCHEMA {schema}"))
        .execute(&admin).await.unwrap();
    admin.close().await;
    sqlx::postgres::PgPoolOptions::new().max_connections(3)
        .after_connect(move |connection, _| Box::pin(async move {
            sqlx::query(&format!("SET search_path = {schema}"))
                .execute(connection).await?;
            Ok(())
        }))
        .connect(&url).await.unwrap()
}

pub async fn discard(pool: sqlx::PgPool, schema: &'static str) {
    sqlx::query(&format!("DROP SCHEMA {schema} CASCADE"))
        .execute(&pool).await.unwrap();
    pool.close().await;
}
