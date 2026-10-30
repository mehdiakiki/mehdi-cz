use axum::{
    extract::Request,
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use std::time::Duration;

pub async fn slow_auth(request: Request, next: Next) -> Response {
    // Controlled stand-in for an identity lookup, not a password verifier.
    tokio::time::sleep(Duration::from_millis(20)).await;
    if request
        .headers()
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        != Some("Bearer fixture")
    {
        return axum::http::StatusCode::UNAUTHORIZED.into_response();
    }
    next.run(request).await
}

// article:start deadline
pub async fn deadline(request: Request, next: Next) -> Response {
    match tokio::time::timeout(Duration::from_millis(10), next.run(request)).await {
        Ok(response) => response,
        Err(_) => axum::http::StatusCode::GATEWAY_TIMEOUT.into_response(),
    }
}
// article:end deadline

// article:start order
pub fn router(auth_is_outside: bool) -> Router {
    let app = Router::new().route("/report", get(|| async { "report" }));
    if auth_is_outside {
        app.layer(middleware::from_fn(deadline))
            .layer(middleware::from_fn(slow_auth))
    } else {
        app.layer(middleware::from_fn(slow_auth))
            .layer(middleware::from_fn(deadline))
    }
}
// article:end order

// article:start builder
pub fn builder_router() -> Router {
    Router::new()
        .route("/report", get(|| async { "report" }))
        .layer(
            tower::ServiceBuilder::new()
                .layer(middleware::from_fn(deadline))
                .layer(middleware::from_fn(slow_auth)),
        )
}
// article:end builder
