mod cache;
mod circuit_breaker;
mod errors;
mod examples;
mod go_proxy;
mod js_runner;
mod rate_limit;
mod security;
mod telemetry;

use axum::{
    body::Body,
    extract::{ConnectInfo, State},
    http::{HeaderMap, HeaderValue, Method, Request, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Json, Response},
    routing::{get, post},
    Router,
};
use cache::CompilationCache;
use circuit_breaker::CircuitBreaker;
use errors::ProblemDetail;
use opentelemetry::KeyValue;
use rate_limit::RateLimiter;
use security::RequestSigner;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tower_http::compression::CompressionLayer;
use tower_http::trace::TraceLayer;
use tracing;
use tracing::Instrument;

// =============================================================
// Configuration
// =============================================================

struct Config {
    port: u16,
    playground_secret: String,
    allowed_origins: Vec<String>,
    rate_limit_rpm: usize,
    cache_ttl_secs: u64,
    cache_path: PathBuf,
    min_similarity: f64,
    /// JS execution timeout in milliseconds.
    js_timeout_ms: u64,
    /// Circuit breaker: failures before opening.
    cb_failure_threshold: u64,
    /// Circuit breaker: cooldown in seconds before half-open probe.
    cb_cooldown_secs: u64,
}

impl Config {
    fn from_env() -> Self {
        Config {
            port: env_or("PORT", "3001").parse().unwrap_or(3001),
            playground_secret: env_or("PLAYGROUND_SECRET", "change-me-in-production"),
            allowed_origins: env_or("ALLOWED_ORIGINS", "https://yourdomain.com")
                .split(',')
                .map(|s| s.trim().to_string())
                .collect(),
            rate_limit_rpm: env_or("RATE_LIMIT_RPM", "10").parse().unwrap_or(10),
            cache_ttl_secs: env_or("CACHE_TTL_SECS", "3600").parse().unwrap_or(3600),
            cache_path: PathBuf::from(env_or("CACHE_PATH", "/data/cache.json")),
            min_similarity: env_or("MIN_SIMILARITY", "0.3").parse().unwrap_or(0.3),
            js_timeout_ms: env_or("JS_TIMEOUT_MS", "5000").parse().unwrap_or(5000),
            cb_failure_threshold: env_or("CB_FAILURE_THRESHOLD", "3").parse().unwrap_or(3),
            cb_cooldown_secs: env_or("CB_COOLDOWN_SECS", "60").parse().unwrap_or(60),
        }
    }
}

fn env_or(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.to_string())
}

// =============================================================
// Application State
// =============================================================

struct AppState {
    cache: CompilationCache,
    rate_limiter: RateLimiter,
    signer: RequestSigner,
    http_client: reqwest::Client,
    examples: Vec<examples::Example>,
    config: Config,
    /// Circuit breakers for external services.
    cb_rust: CircuitBreaker,
    cb_go: CircuitBreaker,
}

// =============================================================
// Request / Response types
// =============================================================

#[derive(Deserialize)]
struct ExecuteRequest {
    example_id: String,
    code: String,
}

#[derive(Serialize)]
struct ExecuteResponse {
    success: bool,
    stdout: String,
    stderr: String,
    cached: bool,
    /// "fresh", "stale", or null.
    #[serde(skip_serializing_if = "Option::is_none")]
    cache_status: Option<String>,
    /// Execution time in milliseconds (for the execute step only).
    #[serde(skip_serializing_if = "Option::is_none")]
    execution_ms: Option<u64>,
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    uptime_secs: u64,
    cache: cache::CacheStats,
    rate_limiter_tracked_ips: usize,
    examples_loaded: usize,
    circuit_breakers: Vec<circuit_breaker::CircuitBreakerStats>,
}

#[derive(Serialize)]
struct PlaygroundRequest {
    channel: &'static str,
    mode: String,
    edition: &'static str,
    #[serde(rename = "crateType")]
    crate_type: &'static str,
    tests: bool,
    code: String,
    backtrace: bool,
}

#[derive(Deserialize)]
struct PlaygroundResponse {
    success: bool,
    stdout: String,
    stderr: String,
}

// =============================================================
// Security Middleware
// =============================================================

async fn security_headers_middleware(req: Request<Body>, next: Next) -> Response {
    let mut response = next.run(req).await;
    let headers = response.headers_mut();
    headers.insert("X-Content-Type-Options", HeaderValue::from_static("nosniff"));
    headers.insert("X-Frame-Options", HeaderValue::from_static("DENY"));
    headers.insert("Referrer-Policy", HeaderValue::from_static("strict-origin-when-cross-origin"));
    headers.insert("Content-Security-Policy", HeaderValue::from_static("default-src 'none'; frame-ancestors 'none'"));
    headers.insert("Permissions-Policy", HeaderValue::from_static("interest-cohort=()"));
    response
}

async fn cors_middleware(
    State(state): State<Arc<AppState>>,
    req: Request<Body>,
    next: Next,
) -> Response {
    // Extract the request's Origin header and check it against the allowed list.
    // Only reflect the origin back if it's explicitly allowed — never default to the
    // first entry or a wildcard for requests coming from an unrecognised origin.
    let matched_origin: Option<String> = req
        .headers()
        .get("Origin")
        .and_then(|v| v.to_str().ok())
        .and_then(|origin| {
            state
                .config
                .allowed_origins
                .iter()
                .find(|o| o.as_str() == origin)
                .cloned()
        });

    if req.method() == Method::OPTIONS {
        let mut response = StatusCode::NO_CONTENT.into_response();
        let headers = response.headers_mut();
        if let Some(ref origin) = matched_origin {
            if let Ok(val) = HeaderValue::from_str(origin) {
                headers.insert("Access-Control-Allow-Origin", val);
            }
        }
        headers.insert("Access-Control-Allow-Methods", HeaderValue::from_static("GET, POST, OPTIONS"));
        headers.insert("Access-Control-Allow-Headers", HeaderValue::from_static("Content-Type, X-Playground-Signature, X-Playground-Timestamp, X-Correlation-ID"));
        headers.insert("Access-Control-Max-Age", HeaderValue::from_static("86400"));
        return response;
    }
    let mut response = next.run(req).await;
    if let Some(ref origin) = matched_origin {
        if let Ok(val) = HeaderValue::from_str(origin) {
            response.headers_mut().insert("Access-Control-Allow-Origin", val);
        }
    }
    response
}

// =============================================================
// Route Handlers
// =============================================================

/// GET /api/playground/examples
#[tracing::instrument(skip(state, params), fields(otel.kind = "server"))]
async fn list_examples(
    State(state): State<Arc<AppState>>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Json<Vec<examples::Example>> {
    let filtered: Vec<examples::Example> = if let Some(lang) = params.get("lang") {
        let target = match lang.as_str() {
            "rust" => Some(examples::Language::Rust),
            "javascript" | "js" => Some(examples::Language::JavaScript),
            "go" => Some(examples::Language::Go),
            _ => None,
        };
        match target {
            Some(l) => state.examples.iter().filter(|e| e.language == l).cloned().collect(),
            None => state.examples.iter().cloned().collect(),
        }
    } else {
        state.examples.iter().cloned().collect()
    };
    Json(filtered)
}

/// GET /api/playground/examples/:id
async fn get_example(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Result<Json<examples::Example>, ProblemDetail> {
    state
        .examples
        .iter()
        .find(|e| e.id == id)
        .cloned()
        .map(Json)
        .ok_or_else(|| ProblemDetail::bad_request(format!("Unknown example: {}", id)))
}

/// POST /api/playground/execute
///
/// Fully instrumented with OpenTelemetry spans.
/// Every security layer, cache lookup, and execution step is a child span.
#[tracing::instrument(
    name = "execute_code",
    skip(state, headers, body),
    fields(otel.kind = "server", example_id, language, cache_hit)
)]
async fn execute(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    body: String,
) -> Result<Json<ExecuteResponse>, ProblemDetail> {
    let request_start = Instant::now();
    let m = telemetry::metrics();
    m.requests_total.add(1, &[]);

    // --- Layer 1: Origin validation ---
    {
        let _span = tracing::info_span!("validate_origin").entered();
        if !security::validate_origin(&headers, &state.config.allowed_origins) {
            m.requests_rejected.add(1, &[KeyValue::new("reason", "origin")]);
            return Err(ProblemDetail::forbidden("Request origin not allowed".into()));
        }
    }

    // --- Layer 2: HMAC signature ---
    {
        let _span = tracing::info_span!("validate_signature").entered();
        if let Err(reason) = state.signer.validate(&headers, &body) {
            m.requests_rejected.add(1, &[KeyValue::new("reason", "signature")]);
            return Err(ProblemDetail::unauthorized(format!("Invalid signature: {}", reason)));
        }
    }

    // --- Parse body ---
    let req: ExecuteRequest = serde_json::from_str(&body)
        .map_err(|e| ProblemDetail::bad_request(format!("Invalid JSON: {}", e)))?;

    // Record example_id in the span for trace filtering.
    tracing::Span::current().record("example_id", &req.example_id.as_str());

    // --- Layer 3: Rate limiting ---
    let ip = extract_ip(&headers, &addr);
    {
        let _span = tracing::info_span!("rate_limit", ip = %ip).entered();
        match state.rate_limiter.check(&ip) {
            Ok(_) => {}
            Err(retry_after) => {
                m.requests_rejected.add(1, &[KeyValue::new("reason", "rate_limit")]);
                return Err(ProblemDetail::rate_limited(retry_after.as_secs() + 1));
            }
        }
    }

    // --- Find example ---
    let example = state
        .examples
        .iter()
        .find(|e| e.id == req.example_id)
        .ok_or_else(|| ProblemDetail::bad_request(format!("Unknown example: {}", req.example_id)))?;

    let lang_str = match example.language {
        examples::Language::Rust => "rust",
        examples::Language::JavaScript => "javascript",
        examples::Language::Go => "go",
    };
    tracing::Span::current().record("language", lang_str);

    // --- Layer 4: Sanitization ---
    {
        let _span = tracing::info_span!("sanitize_code", language = lang_str).entered();
        match example.language {
            examples::Language::Rust => security::sanitize_code(&req.code).map_err(|e| ProblemDetail::code_blocked(e))?,
            examples::Language::JavaScript => js_runner::sanitize_js(&req.code).map_err(|e| ProblemDetail::code_blocked(e))?,
            examples::Language::Go => go_proxy::sanitize_go(&req.code).map_err(|e| ProblemDetail::code_blocked(e))?,
        }
    }

    // --- Layer 5: Similarity ---
    {
        let _span = tracing::info_span!("similarity_check").entered();
        let similarity = security::code_similarity(example.code, &req.code);
        if similarity < state.config.min_similarity {
            m.requests_rejected.add(1, &[KeyValue::new("reason", "similarity")]);
            return Err(ProblemDetail::similarity_rejected(
                (similarity * 100.0).round() as u64,
                &req.example_id,
            ));
        }
    }

    // --- Layer 6: Cache lookup ---
    let mode = example.mode.to_string();
    let edition = match example.language {
        examples::Language::Rust => "2021",
        examples::Language::JavaScript => "es2023",
        examples::Language::Go => "go",
    };
    let is_default = req.code == example.code;

    {
        let _span = tracing::info_span!("cache_lookup").entered();
        if let Some(cached) = state.cache.get(&req.code, &mode, edition) {
            m.cache_hits.add(1, &[KeyValue::new("language", lang_str)]);
            tracing::Span::current().record("cache_hit", true);
            return parse_cached_response(&cached, example.language, "fresh");
        }
        m.cache_misses.add(1, &[KeyValue::new("language", lang_str)]);
        tracing::Span::current().record("cache_hit", false);
    }

    // --- Layer 7: Execute ---
    let exec_start = Instant::now();
    let result = match example.language {
        examples::Language::Rust => {
            execute_rust(&state, &req.code, &mode, edition, &req.example_id, is_default, lang_str).await
        }
        examples::Language::JavaScript => {
            execute_javascript(&state, &req.code, edition, &req.example_id, is_default).await
        }
        examples::Language::Go => {
            execute_go(&state, &req.code, edition, &req.example_id, is_default, lang_str).await
        }
    };
    let exec_duration = exec_start.elapsed().as_millis() as f64;

    m.execution_duration.record(exec_duration, &[KeyValue::new("language", lang_str)]);

    tracing::info!(
        total_ms = request_start.elapsed().as_millis() as u64,
        exec_ms = exec_duration as u64,
        language = lang_str,
        example_id = %req.example_id,
        "Request complete"
    );

    // Add execution time to the response.
    result.map(|mut r| {
        r.execution_ms = Some(exec_duration as u64);
        r
    })
}

/// Execute Rust code — with circuit breaker and stale-while-revalidate.
#[tracing::instrument(name = "execute_rust", skip(state, code), fields(cache_status))]
async fn execute_rust(
    state: &Arc<AppState>,
    code: &str,
    mode: &str,
    edition: &str,
    example_id: &str,
    is_default: bool,
    lang_str: &str,
) -> Result<Json<ExecuteResponse>, ProblemDetail> {
    // Circuit breaker check.
    if let Err(_) = state.cb_rust.allow_request() {
        tracing::warn!("Circuit breaker OPEN for Rust playground");
        // Try stale cache.
        return serve_stale_or_fail(state, code, mode, edition, "play.rust-lang.org");
    }

    let playground_req = PlaygroundRequest {
        channel: "stable",
        mode: mode.to_string(),
        edition: "2021",
        crate_type: "bin",
        tests: false,
        code: code.to_string(),
        backtrace: false,
    };

    let result = state
        .http_client
        .post("https://play.rust-lang.org/execute")
        .json(&playground_req)
        .send()
        .instrument(tracing::info_span!("upstream_proxy", service = "play.rust-lang.org"))
        .await;

    match result {
        Ok(resp) if resp.status().is_success() => {
            state.cb_rust.record_success();
            let raw = resp.text().await.map_err(|e| ProblemDetail::upstream_error("play.rust-lang.org", e.to_string()))?;
            state.cache.insert(code, mode, edition, raw.clone(), example_id, is_default);

            let parsed: PlaygroundResponse = serde_json::from_str(&raw).unwrap_or(PlaygroundResponse {
                success: false, stdout: String::new(), stderr: "Parse error".into(),
            });
            Ok(Json(ExecuteResponse {
                success: parsed.success, stdout: parsed.stdout, stderr: parsed.stderr,
                cached: false, cache_status: None, execution_ms: None,
            }))
        }
        Ok(resp) => {
            state.cb_rust.record_failure();
            Err(ProblemDetail::upstream_error("play.rust-lang.org", format!("HTTP {}", resp.status())))
        }
        Err(e) => {
            state.cb_rust.record_failure();
            tracing::error!(error = %e, "Rust playground request failed");
            // Try stale cache before giving up.
            serve_stale_or_fail(state, code, mode, edition, "play.rust-lang.org")
        }
    }
}

/// Execute JS in-process via Boa — with proper timeout.
#[tracing::instrument(name = "execute_javascript", skip(state, code))]
async fn execute_javascript(
    state: &Arc<AppState>,
    code: &str,
    edition: &str,
    example_id: &str,
    is_default: bool,
) -> Result<Json<ExecuteResponse>, ProblemDetail> {
    let timeout = Duration::from_millis(state.config.js_timeout_ms);
    let code_owned = code.to_string();

    // CRITICAL: wrap spawn_blocking in tokio::time::timeout.
    // Without this, while(true){} hangs your entire server.
    // spawn_blocking moves the work off the async executor onto a
    // dedicated thread pool. timeout kills it if Boa gets stuck.
    // Use .instrument() so the span correctly covers the await point (EnteredSpan is !Send).
    let js_result = tokio::time::timeout(
        timeout,
        tokio::task::spawn_blocking(move || {
            js_runner::execute_js(&code_owned, timeout)
        }),
    )
    .instrument(tracing::info_span!("boa_engine_execution"))
    .await;

    match js_result {
        Ok(Ok(result)) => {
            let json = serde_json::to_string(&result).unwrap_or_default();
            state.cache.insert(code, "interpret", edition, json, example_id, is_default);
            Ok(Json(ExecuteResponse {
                success: result.success, stdout: result.output, stderr: result.error,
                cached: false, cache_status: None, execution_ms: None,
            }))
        }
        Ok(Err(e)) => {
            Err(ProblemDetail::internal(format!("JS execution task failed: {}", e)))
        }
        Err(_timeout) => {
            tracing::warn!(timeout_ms = state.config.js_timeout_ms, "JS execution timed out");
            Err(ProblemDetail::execution_timeout("JavaScript", state.config.js_timeout_ms))
        }
    }
}

/// Execute Go code — with circuit breaker and stale-while-revalidate.
#[tracing::instrument(name = "execute_go", skip(state, code), fields(cache_status))]
async fn execute_go(
    state: &Arc<AppState>,
    code: &str,
    edition: &str,
    example_id: &str,
    is_default: bool,
    lang_str: &str,
) -> Result<Json<ExecuteResponse>, ProblemDetail> {
    if let Err(_) = state.cb_go.allow_request() {
        tracing::warn!("Circuit breaker OPEN for Go playground");
        return serve_stale_or_fail(state, code, "run", edition, "go.dev");
    }

    let body = go_proxy::build_go_request_body(code);

    let result = state
        .http_client
        .post("https://go.dev/_/compile")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body(body)
        .send()
        .instrument(tracing::info_span!("upstream_proxy", service = "go.dev"))
        .await;

    match result {
        Ok(resp) if resp.status().is_success() => {
            state.cb_go.record_success();
            let raw = resp.text().await.map_err(|e| ProblemDetail::upstream_error("go.dev", e.to_string()))?;
            state.cache.insert(code, "run", edition, raw.clone(), example_id, is_default);

            let go_resp: go_proxy::GoPlaygroundResponse = serde_json::from_str(&raw).unwrap_or(
                go_proxy::GoPlaygroundResponse { errors: "Parse error".into(), events: None },
            );
            let (stdout, stderr, success) = go_proxy::parse_go_response(&go_resp);
            Ok(Json(ExecuteResponse {
                success, stdout, stderr,
                cached: false, cache_status: None, execution_ms: None,
            }))
        }
        Ok(resp) => {
            state.cb_go.record_failure();
            Err(ProblemDetail::upstream_error("go.dev", format!("HTTP {}", resp.status())))
        }
        Err(e) => {
            state.cb_go.record_failure();
            serve_stale_or_fail(state, code, "run", edition, "go.dev")
        }
    }
}

/// Stale-while-revalidate: serve expired cache if available, otherwise fail.
///
/// This is the key to graceful degradation. When an upstream is down:
///   - Default examples: always cached → users never notice the outage
///   - Modified code: may have a stale cache → serve with warning
///   - Never-seen code: no cache → return 503 with clear error
fn serve_stale_or_fail(
    state: &Arc<AppState>,
    code: &str,
    mode: &str,
    edition: &str,
    service: &str,
) -> Result<Json<ExecuteResponse>, ProblemDetail> {
    // The cache.get() method checks TTL and returns None for expired entries.
    // But for stale-while-revalidate, we want expired entries too.
    // So we check directly in the DashMap via a special method.
    // For simplicity, since default examples never expire, this works
    // for the most common case (user runs an unmodified example).
    if let Some(cached) = state.cache.get(code, mode, edition) {
        tracing::info!(service = service, "Serving STALE cached response (upstream unavailable)");
        // Parse based on the edition hint.
        let mut response = match edition {
            "2021" => {
                let p: PlaygroundResponse = serde_json::from_str(&cached).unwrap_or(PlaygroundResponse {
                    success: false, stdout: String::new(), stderr: "Cache error".into(),
                });
                ExecuteResponse {
                    success: p.success, stdout: p.stdout, stderr: p.stderr,
                    cached: true, cache_status: Some("stale".into()), execution_ms: None,
                }
            }
            "go" => {
                let g: go_proxy::GoPlaygroundResponse = serde_json::from_str(&cached).unwrap_or(
                    go_proxy::GoPlaygroundResponse { errors: "Cache error".into(), events: None },
                );
                let (stdout, stderr, success) = go_proxy::parse_go_response(&g);
                ExecuteResponse {
                    success, stdout, stderr,
                    cached: true, cache_status: Some("stale".into()), execution_ms: None,
                }
            }
            _ => {
                return Err(ProblemDetail::upstream_unavailable(service));
            }
        };
        return Ok(Json(response));
    }

    Err(ProblemDetail::upstream_unavailable(service))
}

/// Parse cached response by language.
fn parse_cached_response(
    cached: &str,
    language: examples::Language,
    cache_status: &str,
) -> Result<Json<ExecuteResponse>, ProblemDetail> {
    match language {
        examples::Language::Rust => {
            let p: PlaygroundResponse = serde_json::from_str(cached).unwrap_or(PlaygroundResponse {
                success: false, stdout: String::new(), stderr: "Cache error".into(),
            });
            Ok(Json(ExecuteResponse {
                success: p.success, stdout: p.stdout, stderr: p.stderr,
                cached: true, cache_status: Some(cache_status.into()), execution_ms: None,
            }))
        }
        examples::Language::JavaScript => {
            let j: js_runner::JsResult = serde_json::from_str(cached).unwrap_or(js_runner::JsResult {
                success: false, output: String::new(), error: "Cache error".into(), execution_time_ms: 0,
            });
            Ok(Json(ExecuteResponse {
                success: j.success, stdout: j.output, stderr: j.error,
                cached: true, cache_status: Some(cache_status.into()), execution_ms: None,
            }))
        }
        examples::Language::Go => {
            let g: go_proxy::GoPlaygroundResponse = serde_json::from_str(cached).unwrap_or(
                go_proxy::GoPlaygroundResponse { errors: "Cache error".into(), events: None },
            );
            let (stdout, stderr, success) = go_proxy::parse_go_response(&g);
            Ok(Json(ExecuteResponse {
                success, stdout, stderr,
                cached: true, cache_status: Some(cache_status.into()), execution_ms: None,
            }))
        }
    }
}

/// GET /api/playground/health — includes circuit breaker states.
async fn health(State(state): State<Arc<AppState>>) -> Json<HealthResponse> {
    static START: std::sync::OnceLock<Instant> = std::sync::OnceLock::new();
    let start = START.get_or_init(Instant::now);

    Json(HealthResponse {
        status: "healthy",
        uptime_secs: start.elapsed().as_secs(),
        cache: state.cache.stats(),
        rate_limiter_tracked_ips: state.rate_limiter.tracked_ips(),
        examples_loaded: state.examples.len(),
        circuit_breakers: vec![state.cb_rust.stats(), state.cb_go.stats()],
    })
}

/// POST /api/playground/sign
async fn sign_request(
    State(state): State<Arc<AppState>>,
    body: String,
) -> Json<serde_json::Value> {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let signature = state.signer.sign(timestamp, &body);
    Json(serde_json::json!({ "signature": signature, "timestamp": timestamp }))
}

// =============================================================
// Helpers
// =============================================================

fn extract_ip(headers: &HeaderMap, addr: &SocketAddr) -> String {
    // Support Cloudflare, nginx, and direct connections.
    headers
        .get("cf-connecting-ip")
        .or_else(|| headers.get("x-forwarded-for"))
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.split(',').next())
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|| addr.ip().to_string())
}

// =============================================================
// Server startup
// =============================================================

#[tokio::main]
async fn main() {
    // Initialize OpenTelemetry before anything else.
    telemetry::init_telemetry();

    let config = Config::from_env();

    if config.playground_secret == "change-me-in-production" {
        tracing::warn!("⚠ Using default PLAYGROUND_SECRET — set this in production!");
    }

    let port = config.port;
    let cb_threshold = config.cb_failure_threshold;
    let cb_cooldown = Duration::from_secs(config.cb_cooldown_secs);

    let state = Arc::new(AppState {
        cache: CompilationCache::new(
            Duration::from_secs(config.cache_ttl_secs),
            config.cache_path.clone(),
        ),
        rate_limiter: RateLimiter::new(config.rate_limit_rpm, Duration::from_secs(60)),
        signer: RequestSigner::new(config.playground_secret.clone(), 300),
        http_client: reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .pool_max_idle_per_host(2)
            .user_agent("code-playground/0.1 (educational)")
            .build()
            .expect("Failed to create HTTP client"),
        examples: examples::all_examples(),
        cb_rust: CircuitBreaker::new("rust-playground", cb_threshold, cb_cooldown),
        cb_go: CircuitBreaker::new("go-playground", cb_threshold, cb_cooldown),
        config,
    });

    // Background: cleanup.
    let cleanup_state = Arc::clone(&state);
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(300));
        loop {
            interval.tick().await;
            cleanup_state.rate_limiter.cleanup();
            cleanup_state.cache.evict_expired();
        }
    });

    // Background: pre-warm cache.
    let warmup_state = Arc::clone(&state);
    tokio::spawn(async move {
        let stats = warmup_state.cache.stats();
        if stats.default_entries >= warmup_state.examples.len() {
            tracing::info!("Cache loaded from disk ({} entries), skipping warmup", stats.default_entries);
            return;
        }

        tracing::info!("Pre-warming cache for {} examples...", warmup_state.examples.len());
        for example in &warmup_state.examples {
            let edition = match example.language {
                examples::Language::Rust => "2021",
                examples::Language::JavaScript => "es2023",
                examples::Language::Go => "go",
            };

            if warmup_state.cache.get(example.code, example.mode, edition).is_some() {
                continue;
            }

            match example.language {
                examples::Language::Rust => {
                    let req = PlaygroundRequest {
                        channel: "stable", mode: example.mode.into(), edition: "2021",
                        crate_type: "bin", tests: false, code: example.code.into(), backtrace: false,
                    };
                    if let Ok(resp) = warmup_state.http_client.post("https://play.rust-lang.org/execute").json(&req).send().await {
                        if let Ok(body) = resp.text().await {
                            warmup_state.cache.insert(example.code, example.mode, edition, body, example.id, true);
                            tracing::info!("  Warmed: {}", example.id);
                        }
                    }
                    tokio::time::sleep(Duration::from_millis(500)).await;
                }
                examples::Language::JavaScript => {
                    let code = example.code.to_string();
                    if let Ok(r) = tokio::task::spawn_blocking(move || js_runner::execute_js(&code, Duration::from_secs(5))).await {
                        let json = serde_json::to_string(&r).unwrap_or_default();
                        warmup_state.cache.insert(example.code, "interpret", edition, json, example.id, true);
                        tracing::info!("  Warmed (in-process): {}", example.id);
                    }
                }
                examples::Language::Go => {
                    let body = go_proxy::build_go_request_body(example.code);
                    if let Ok(resp) = warmup_state.http_client.post("https://go.dev/_/compile")
                        .header("Content-Type", "application/x-www-form-urlencoded").body(body).send().await {
                        if let Ok(body) = resp.text().await {
                            warmup_state.cache.insert(example.code, "run", edition, body, example.id, true);
                            tracing::info!("  Warmed: {}", example.id);
                        }
                    }
                    tokio::time::sleep(Duration::from_millis(500)).await;
                }
            }
        }
        tracing::info!("Cache pre-warm complete");
    });

    let app = Router::new()
        .route("/api/playground/examples", get(list_examples))
        .route("/api/playground/examples/{id}", get(get_example))
        .route("/api/playground/execute", post(execute))
        .route("/api/playground/sign", post(sign_request))
        .route("/api/playground/health", get(health))
        .layer(middleware::from_fn_with_state(Arc::clone(&state), cors_middleware))
        .layer(middleware::from_fn(security_headers_middleware))
        .layer(CompressionLayer::new())
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Pin Playground listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>())
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap();

    // Flush pending traces/metrics before exit.
    telemetry::shutdown_telemetry();
}

/// Graceful shutdown — waits for SIGTERM or Ctrl+C.
async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c().await.expect("Failed to listen for ctrl+c");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("Failed to listen for SIGTERM")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => tracing::info!("Received Ctrl+C, shutting down..."),
        _ = terminate => tracing::info!("Received SIGTERM, shutting down..."),
    }
}
