use axum::{
    body::Body,
    extract::State,
    http::{HeaderMap, Request, StatusCode},
    routing::get,
    Router,
};
use rust_backend_labs::{database, discard, sessions::*};
use sqlx::PgPool;
use tower::ServiceExt;

async fn account(State(pool): State<PgPool>, headers: HeaderMap) -> StatusCode {
    let token = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "));
    let Some(token) = token else {
        return StatusCode::UNAUTHORIZED;
    };
    match session_user(&pool, token).await {
        Ok(Some(_)) => StatusCode::OK,
        Ok(None) => StatusCode::UNAUTHORIZED,
        Err(_) => StatusCode::SERVICE_UNAVAILABLE,
    }
}

#[tokio::test]
async fn a_revoked_session_is_rejected_by_an_independent_replica() {
    let a = database("backend_sessions").await;
    sqlx::query("CREATE TABLE sessions (token_hash bytea PRIMARY KEY, user_id bigint NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz)").execute(&a).await.unwrap();
    let url = std::env::var("SQL_RUST_PG_URL").unwrap();
    let b = sqlx::postgres::PgPoolOptions::new()
        .max_connections(2)
        .after_connect(|c, _| {
            Box::pin(async move {
                sqlx::query("SET search_path = backend_sessions")
                    .execute(c)
                    .await?;
                Ok(())
            })
        })
        .connect(&url)
        .await
        .unwrap();
    let token = "synthetic-test-session-not-a-production-secret";
    sqlx::query("INSERT INTO sessions VALUES ($1, 7, clock_timestamp() + interval '1 hour', NULL)")
        .bind(verifier(token))
        .execute(&a)
        .await
        .unwrap();
    let app_a = Router::new()
        .route("/account", get(account))
        .with_state(a.clone());
    let app_b = Router::new()
        .route("/account", get(account))
        .with_state(b.clone());
    let request = || {
        Request::get("/account")
            .header("authorization", format!("Bearer {token}"))
            .body(Body::empty())
            .unwrap()
    };
    assert_eq!(
        app_a.clone().oneshot(request()).await.unwrap().status(),
        StatusCode::OK
    );
    assert_eq!(
        app_b.clone().oneshot(request()).await.unwrap().status(),
        StatusCode::OK
    );
    // This identity was already admitted before logout. Revocation cannot undo it.
    let already_authorized = session_user(&a, token).await.unwrap();
    revoke(&a, token).await.unwrap();
    assert_eq!(already_authorized, Some(7));
    assert_eq!(
        app_a.oneshot(request()).await.unwrap().status(),
        StatusCode::UNAUTHORIZED
    );
    assert_eq!(
        app_b.oneshot(request()).await.unwrap().status(),
        StatusCode::UNAUTHORIZED
    );
    assert_eq!(session_user(&b, "unknown-session").await.unwrap(), None);
    revoke(&a, token).await.unwrap();
    println!("before logout: A=200 B=200; after committed logout: A=401 B=401");
    for (extra_token, expires) in [
        ("expired-fixture", -3600.0_f64),
        ("other-fixture", 3600.0_f64),
    ] {
        sqlx::query("INSERT INTO sessions VALUES ($1, 8, clock_timestamp() + make_interval(secs => $2), NULL)")
            .bind(verifier(extra_token)).bind(expires).execute(&a).await.unwrap();
    }
    let check = Router::new()
        .route("/account", get(account))
        .with_state(b.clone());
    for (extra_token, expected) in [("expired-fixture", 401), ("other-fixture", 200)] {
        let response = check
            .clone()
            .oneshot(
                Request::get("/account")
                    .header("authorization", format!("Bearer {extra_token}"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), expected);
    }
    b.close().await;
    let response = check
        .oneshot(
            Request::get("/account")
                .header("authorization", "Bearer other-fixture")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    println!("expired=401; separate active session=200; closed session store=503");
    discard(a, "backend_sessions").await;
}
