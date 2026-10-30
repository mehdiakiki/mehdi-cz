use axum::{
    body::Body,
    extract::{Path, State},
    http::{HeaderMap, Request, StatusCode},
    routing::{get, patch},
    Json, Router,
};
use http_body_util::BodyExt;
use rust_backend_labs::{database, discard};
use sqlx::PgPool;
use tower::ServiceExt;

fn principal(headers: &HeaderMap) -> Result<&'static str, StatusCode> {
    match headers.get("authorization").and_then(|value| value.to_str().ok()) {
        Some("Bearer fixture-alice") => Ok("tenant-a"),
        Some("Bearer fixture-bob") => Ok("tenant-b"),
        _ => Err(StatusCode::UNAUTHORIZED),
    }
}

async fn read_record(State(pool): State<PgPool>, headers: HeaderMap, Path(id): Path<i32>) -> Result<Json<String>, StatusCode> {
    let tenant = principal(&headers)?;
    let value: Option<String> = sqlx::query_scalar("SELECT name FROM records WHERE id = $1 AND tenant = $2")
        .bind(id).bind(tenant).fetch_optional(&pool).await.map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
    value.map(Json).ok_or(StatusCode::NOT_FOUND)
}

async fn list_records(State(pool): State<PgPool>, headers: HeaderMap) -> Result<Json<Vec<String>>, StatusCode> {
    let tenant = principal(&headers)?;
    let values = sqlx::query_scalar("SELECT name FROM records WHERE tenant = $1 ORDER BY id")
        .bind(tenant).fetch_all(&pool).await.map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
    Ok(Json(values))
}

async fn rename_record(State(pool): State<PgPool>, headers: HeaderMap, Path(id): Path<i32>) -> Result<StatusCode, StatusCode> {
    let tenant = principal(&headers)?;
    let changed = sqlx::query("UPDATE records SET name = 'renamed' WHERE id = $1 AND tenant = $2")
        .bind(id).bind(tenant).execute(&pool).await.map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?.rows_affected();
    if changed == 1 { Ok(StatusCode::NO_CONTENT) } else { Err(StatusCode::NOT_FOUND) }
}

async fn call(app: &Router, method: &str, path: &str, token: Option<&str>, fake_tenant: &str) -> (StatusCode, String) {
    let mut request = Request::builder().method(method).uri(path).header("x-tenant-id", fake_tenant);
    if let Some(token) = token { request = request.header("authorization", token); }
    let response = app.clone().oneshot(request.body(Body::empty()).unwrap()).await.unwrap();
    let status = response.status();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    (status, String::from_utf8(bytes.to_vec()).unwrap())
}

#[tokio::test]
async fn authenticated_reads_lists_and_writes_stay_inside_their_tenant() {
    let setup = database("practical_tenant_requests").await;
    sqlx::query("CREATE TABLE records (id integer PRIMARY KEY, tenant text NOT NULL, external_id text NOT NULL, name text NOT NULL)").execute(&setup).await.unwrap();
    sqlx::query("INSERT INTO records VALUES (1,'tenant-a','external-42','private-a'), (2,'tenant-b','external-42','private-b')").execute(&setup).await.unwrap();
    sqlx::query("GRANT USAGE ON SCHEMA practical_tenant_requests TO editorial_app; GRANT SELECT, UPDATE ON practical_tenant_requests.records TO editorial_app")
        .execute(&setup).await.unwrap();
    let pool = sqlx::postgres::PgPoolOptions::new().max_connections(1)
        .after_connect(|connection, _| Box::pin(async move {
            sqlx::query("SET search_path = practical_tenant_requests").execute(connection).await?;
            Ok(())
        }))
        .connect(&std::env::var("SQL_RUST_PG_APP_URL").unwrap()).await.unwrap();
    let app = Router::new().route("/records",get(list_records)).route("/records/{id}",get(read_record).merge(patch(rename_record))).with_state(pool.clone());
    let own = call(&app,"GET","/records/1",Some("Bearer fixture-alice"),"tenant-b").await;
    assert_eq!(own,(StatusCode::OK,"\"private-a\"".into()));
    let forbidden = call(&app,"GET","/records/2",Some("Bearer fixture-alice"),"tenant-b").await;
    assert_eq!(forbidden.0,StatusCode::NOT_FOUND);
    assert!(!forbidden.1.contains("private-b"));
    let listing = call(&app,"GET","/records",Some("Bearer fixture-alice"),"tenant-b").await;
    assert_eq!(listing,(StatusCode::OK,"[\"private-a\"]".into()));
    assert_eq!(call(&app,"PATCH","/records/2",Some("Bearer fixture-alice"),"tenant-b").await.0,StatusCode::NOT_FOUND);
    let stored: String = sqlx::query_scalar("SELECT name FROM records WHERE id = 2").fetch_one(&setup).await.unwrap();
    assert_eq!(stored,"private-b");
    assert_eq!(call(&app,"GET","/records/2",Some("Bearer fixture-bob"),"tenant-a").await,(StatusCode::OK,"\"private-b\"".into()));
    assert_eq!(call(&app,"GET","/records/1",None,"tenant-a").await.0,StatusCode::UNAUTHORIZED);
    println!("TENANTS: authenticated A own=200, other=404, list=[private-a], other update=404 and unchanged; B own=200; forged tenant ignored; no token=401");
    pool.close().await;
    discard(setup,"practical_tenant_requests").await;
}
