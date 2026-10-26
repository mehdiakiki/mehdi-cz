use axum::{body::Body, extract::Json, http::{Request, StatusCode}, routing::post, Router};
use http_body_util::BodyExt;
use rust_backend_labs::errors::{create_invoice, NewInvoice};
use std::sync::{Arc, atomic::{AtomicUsize, Ordering}};
use tower::ServiceExt;

#[tokio::test]
async fn strict_extractor_can_reject_before_the_handler_runs() {
    let calls = Arc::new(AtomicUsize::new(0));
    let observed = calls.clone();
    let app = Router::new().route("/invoices", post(move |Json(_): Json<NewInvoice>| async move {
        observed.fetch_add(1, Ordering::SeqCst);
        StatusCode::CREATED
    }));
    let response = app.oneshot(Request::post("/invoices")
        .header("content-type", "application/json").body(Body::from("{" )).unwrap())
        .await.unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    assert_eq!(calls.load(Ordering::SeqCst), 0);
    println!("strict malformed JSON: status=400 handler_calls=0");
}

#[tokio::test]
async fn rejection_responses_are_json_and_keep_the_meaningful_status() {
    for (body, content_type, status, code) in [
        ("{", Some("application/json"), 400, "invalid_json"),
        ("{}", Some("application/json"), 422, "invalid_json"),
        (r#"{"quantity":1}"#, None, 415, "invalid_json"),
        (r#"{"quantity":0}"#, Some("application/json"), 422, "invalid_quantity"),
    ] {
        let mut request = Request::post("/invoices");
        if let Some(value) = content_type { request = request.header("content-type", value); }
        let response = Router::new().route("/invoices", post(create_invoice))
            .oneshot(request.body(Body::from(body)).unwrap()).await.unwrap();
        assert_eq!(response.status().as_u16(), status);
        assert_eq!(response.headers()["content-type"], "application/json");
        let bytes = response.into_body().collect().await.unwrap().to_bytes();
        let result: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(result["error"]["code"], code);
        println!("custom rejection: status={status} code={code}");
    }
}

#[tokio::test]
async fn a_valid_request_still_reaches_the_success_path() {
    let response = Router::new().route("/invoices", post(create_invoice)).oneshot(
        Request::post("/invoices").header("content-type", "application/json")
            .body(Body::from(r#"{"quantity":2}"#)).unwrap()
    ).await.unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
}
