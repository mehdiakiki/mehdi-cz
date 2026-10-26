use axum::{body::Body, http::Request};
use rust_backend_labs::middleware::{builder_router, router};
use tower::ServiceExt;

#[tokio::test(start_paused = true)]
async fn the_timeout_covers_only_the_layers_inside_it() {
    for (auth_outside, authorized, expected) in [
        (true, true, 200),
        (false, true, 504),
        (true, false, 401),
        (false, false, 504),
    ] {
        let mut request = Request::get("/report");
        if authorized {
            request = request.header("authorization", "Bearer fixture");
        }
        let start = tokio::time::Instant::now();
        let response = router(auth_outside)
            .oneshot(request.body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status().as_u16(), expected);
        let elapsed = start.elapsed().as_millis();
        assert_eq!(elapsed, if auth_outside { 20 } else { 10 });
        println!("auth_outside={auth_outside} authorized={authorized} status={expected} virtual_ms={elapsed}");
    }
}

#[tokio::test(start_paused = true)]
async fn service_builder_runs_the_first_added_layer_first() {
    for authorized in [false, true] {
        let mut request = Request::get("/report");
        if authorized {
            request = request.header("authorization", "Bearer fixture");
        }
        let start = tokio::time::Instant::now();
        let response = builder_router()
            .oneshot(request.body(Body::empty()).unwrap())
            .await.unwrap();
        assert_eq!(response.status(), 504);
        assert_eq!(start.elapsed().as_millis(), 10);
    }
    println!("ServiceBuilder: first layer is the outer deadline; accepted/rejected=504 at virtual_ms=10");
}
