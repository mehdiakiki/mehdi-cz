use axum::{routing::get, Router};
use std::sync::Arc;
use tokio::sync::{oneshot, Mutex};

#[tokio::test]
async fn a_slow_http_call_only_retains_a_connection_when_the_scope_retains_it() {
    for early_release in [false, true] {
        let pool = sqlx::postgres::PgPoolOptions::new().max_connections(1)
            .connect(&std::env::var("SQL_RUST_PG_URL").unwrap()).await.unwrap();
        let (arrived, observed) = oneshot::channel();
        let (release, wait) = oneshot::channel();
        let arrived = Arc::new(Mutex::new(Some(arrived)));
        let wait = Arc::new(Mutex::new(Some(wait)));
        let app = Router::new().route("/", get(move || {
            let arrived = arrived.clone(); let wait = wait.clone();
            async move {
                arrived.lock().await.take().unwrap().send(()).unwrap();
                let wait = wait.lock().await.take().unwrap(); wait.await.unwrap(); "ok"
            }
        }));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}/",listener.local_addr().unwrap());
        let server = tokio::spawn(async move { axum::serve(listener,app).await.unwrap(); });
        let worker_pool = pool.clone();
        let worker = tokio::spawn(async move {
            let mut connection = worker_pool.acquire().await.unwrap();
            let value: i32 = sqlx::query_scalar("SELECT 42").fetch_one(&mut *connection).await.unwrap();
            assert_eq!(value,42);
            let retained = if early_release { drop(connection); None } else { Some(connection) };
            let response = reqwest::get(url).await.unwrap().error_for_status().unwrap();
            assert_eq!(response.text().await.unwrap(),"ok");
            drop(retained);
        });
        observed.await.unwrap();
        let available = pool.try_acquire(); assert_eq!(available.is_some(),early_release); drop(available);
        if early_release {
            let value: i32 = sqlx::query_scalar("SELECT 7").fetch_one(&pool).await.unwrap(); assert_eq!(value,7);
        }
        release.send(()).unwrap(); worker.await.unwrap();
        let recovered: i32 = sqlx::query_scalar("SELECT 8").fetch_one(&pool).await.unwrap(); assert_eq!(recovered,8);
        println!("HTTP_CONNECTION_SCOPE: early_release={early_release}; HTTP paused; pool available={early_release}; query after completion=8");
        server.abort(); assert!(server.await.unwrap_err().is_cancelled()); pool.close().await;
    }
}
