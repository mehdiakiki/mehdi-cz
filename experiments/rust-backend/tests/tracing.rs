use axum::{body::Body, extract::State, http::Request, routing::get, Router};
use rust_backend_labs::{database, discard};
use sqlx::PgPool;
use std::sync::{Arc, Mutex};
use tower::ServiceExt;
use tracing::{
    field::{Field, Visit},
    Event, Instrument, Subscriber,
};
use tracing_subscriber::{
    layer::{Context, SubscriberExt},
    registry::LookupSpan,
    Layer,
};

type Records = Arc<Mutex<Vec<(String, Vec<String>)>>>;
#[derive(Clone)]
struct Capture(Records);
#[derive(Default)]
struct Stage(String);
impl Visit for Stage {
    fn record_str(&mut self, field: &Field, value: &str) {
        if field.name() == "stage" {
            self.0 = value.into();
        }
    }
    fn record_debug(&mut self, _: &Field, _: &dyn std::fmt::Debug) {}
}
impl<S: Subscriber + for<'a> LookupSpan<'a>> Layer<S> for Capture {
    fn on_event(&self, event: &Event<'_>, context: Context<'_, S>) {
        let mut stage = Stage::default();
        event.record(&mut stage);
        if stage.0.is_empty() {
            return;
        }
        let parents = context
            .event_scope(event)
            .map(|scope| {
                scope
                    .from_root()
                    .map(|span| span.name().to_owned())
                    .collect()
            })
            .unwrap_or_default();
        self.0.lock().unwrap().push((stage.0, parents));
    }
}

#[derive(Clone)]
struct App {
    pool: PgPool,
    carry_span: bool,
}

async fn lookup(State(state): State<App>) -> String {
    let work = async move {
        let value: i32 = sqlx::query_scalar("SELECT 42")
            .fetch_one(&state.pool)
            .await
            .unwrap();
        tracing::info!(stage = "db-result", value);
        value.to_string()
    };
    // article:start spawn
    let task = if state.carry_span {
        tokio::spawn(work.in_current_span())
    } else {
        tokio::spawn(work)
    };
    task.await.unwrap()
    // article:end spawn
}

#[test]
fn a_spawned_database_lookup_needs_its_request_span() {
    let records: Records = Arc::new(Mutex::new(Vec::new()));
    let subscriber = tracing_subscriber::registry().with(Capture(records.clone()));
    tracing::subscriber::with_default(subscriber, || {
        // One runtime thread keeps this test subscriber local to this test.
        let runtime = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();
        runtime.block_on(async {
            let pool = database("backend_tracing").await;
            for carry_span in [false, true] {
                let app = Router::new().route("/answer", get(lookup)).with_state(App {
                    pool: pool.clone(),
                    carry_span,
                });
                let response = app
                    .oneshot(Request::get("/answer").body(Body::empty()).unwrap())
                    .instrument(tracing::info_span!(
                        "http.request",
                        request_id = "synthetic-42"
                    ))
                    .await
                    .unwrap();
                assert_eq!(response.status(), 200);
            }
            discard(pool, "backend_tracing").await;
        });
    });
    let records = records.lock().unwrap();
    assert_eq!(records.len(), 2);
    assert!(records[0].1.is_empty());
    assert_eq!(records[1].1, ["http.request"]);
    println!(
        "plain spawn: request ancestors=[]; instrumented spawn: request ancestors=[http.request]"
    );
}
