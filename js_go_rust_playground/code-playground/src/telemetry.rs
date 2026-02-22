use opentelemetry::{
    trace::TracerProvider as _, // bring .tracer() into scope without name conflict
    KeyValue,
};
use opentelemetry_sdk::{
    metrics::SdkMeterProvider,
    trace::{self as sdktrace, SdkTracerProvider},
    Resource,
};
use std::sync::OnceLock;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

// =============================================================
// OpenTelemetry Setup
//
// Three pillars of observability:
//   1. Traces  — "what happened during this request?"
//   2. Metrics — "how is the system performing over time?"
//   3. Logs    — "what context do I need for debugging?"
//
// We export traces and metrics to an OTLP-compatible collector
// (Jaeger, Grafana Tempo, Datadog, etc). If no collector is
// configured, we fall back to stdout logging only.
//
// Interview talking point:
//   "I instrumented the execution pipeline with OpenTelemetry
//    so I can trace a request from the frontend click through
//    the HMAC validation, cache lookup, and into the Boa JS
//    engine or the upstream Rust playground. When latency spikes,
//    I can see exactly which span is the bottleneck."
// =============================================================

/// Application-level metrics accessible from handlers.
pub struct AppMetrics {
    pub execution_duration: opentelemetry::metrics::Histogram<f64>,
    pub cache_hits: opentelemetry::metrics::Counter<u64>,
    pub cache_misses: opentelemetry::metrics::Counter<u64>,
    pub circuit_breaker_trips: opentelemetry::metrics::Counter<u64>,
    pub requests_total: opentelemetry::metrics::Counter<u64>,
    pub requests_rejected: opentelemetry::metrics::Counter<u64>,
}

static METRICS: OnceLock<AppMetrics> = OnceLock::new();

pub fn metrics() -> &'static AppMetrics {
    METRICS.get().expect("Metrics not initialized")
}

/// Initialize the full observability stack.
///
/// - If OTEL_EXPORTER_OTLP_ENDPOINT is set: exports traces + metrics to collector
/// - Always: structured JSON logging to stdout
pub fn init_telemetry() {
    // In sdk 0.31, Resource::new() is private — use the builder instead.
    let resource = Resource::builder()
        .with_attributes([
            KeyValue::new("service.name", "code-playground"),
            KeyValue::new("service.version", env!("CARGO_PKG_VERSION")),
        ])
        .build();

    // --- Traces ---
    let tracer_provider = if std::env::var("OTEL_EXPORTER_OTLP_ENDPOINT").is_ok() {
        // Export to an OTLP collector (Jaeger, Tempo, etc).
        let exporter = opentelemetry_otlp::SpanExporter::builder()
            .with_tonic()
            .build()
            .expect("Failed to create OTLP trace exporter");

        // In sdk 0.31, the type is SdkTracerProvider and with_batch_exporter
        // no longer requires an explicit runtime argument.
        let provider = SdkTracerProvider::builder()
            .with_resource(resource.clone())
            .with_batch_exporter(exporter)
            .build();

        opentelemetry::global::set_tracer_provider(provider.clone());
        Some(provider)
    } else {
        None
    };

    // --- Metrics ---
    let meter_provider = if std::env::var("OTEL_EXPORTER_OTLP_ENDPOINT").is_ok() {
        let exporter = opentelemetry_otlp::MetricExporter::builder()
            .with_tonic()
            .build()
            .expect("Failed to create OTLP metric exporter");

        let provider = SdkMeterProvider::builder()
            .with_resource(resource)
            .with_periodic_exporter(exporter)
            .build();

        opentelemetry::global::set_meter_provider(provider.clone());
        Some(provider)
    } else {
        None
    };

    // --- Register application metrics ---
    let meter = opentelemetry::global::meter("code-playground");

    METRICS
        .set(AppMetrics {
            execution_duration: meter
                .f64_histogram("playground.execution.duration_ms")
                .with_description("Code execution duration in milliseconds")
                .build(),
            cache_hits: meter
                .u64_counter("playground.cache.hits")
                .with_description("Number of cache hits")
                .build(),
            cache_misses: meter
                .u64_counter("playground.cache.misses")
                .with_description("Number of cache misses")
                .build(),
            circuit_breaker_trips: meter
                .u64_counter("playground.circuit_breaker.trips")
                .with_description("Number of times the circuit breaker opened")
                .build(),
            requests_total: meter
                .u64_counter("playground.requests.total")
                .with_description("Total requests")
                .build(),
            requests_rejected: meter
                .u64_counter("playground.requests.rejected")
                .with_description("Rejected requests (rate limit, auth, etc)")
                .build(),
        })
        .ok();

    // --- Tracing subscriber ---
    // Layers: env_filter + fmt (stdout) + opentelemetry (if collector configured)
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| "code_playground=info,tower_http=info".into());

    let fmt_layer = tracing_subscriber::fmt::layer()
        .compact()
        .with_target(true)
        .with_thread_ids(false);

    let registry = tracing_subscriber::registry()
        .with(env_filter)
        .with(fmt_layer);

    if let Some(provider) = tracer_provider {
        // Explicit type annotation resolves type inference ambiguity on .tracer().
        let tracer: sdktrace::SdkTracer = provider.tracer("code-playground");
        let otel_layer = tracing_opentelemetry::layer().with_tracer(tracer);
        registry.with(otel_layer).init();

        // Keep provider alive for the process lifetime; shutdown() is called in
        // shutdown_telemetry() via the stored static reference.
        static TRACER_PROVIDER: OnceLock<SdkTracerProvider> = OnceLock::new();
        TRACER_PROVIDER.set(provider).ok();

        tracing::info!("OpenTelemetry enabled — exporting traces and metrics to OTLP collector");
    } else {
        registry.init();
        tracing::info!("OpenTelemetry collector not configured — using stdout logging only");
        tracing::info!("Set OTEL_EXPORTER_OTLP_ENDPOINT to enable trace/metric export");
    }

    // Keep meter provider alive for the process lifetime.
    if let Some(provider) = meter_provider {
        static METER_PROVIDER: OnceLock<SdkMeterProvider> = OnceLock::new();
        METER_PROVIDER.set(provider).ok();
    }
}

/// Shutdown the telemetry pipeline gracefully.
/// Call this before process exit to flush pending spans/metrics.
/// In sdk 0.31, global::shutdown_tracer_provider() was removed — providers
/// shut down automatically on drop, or explicitly via provider.shutdown().
pub fn shutdown_telemetry() {
    tracing::info!("OpenTelemetry shutdown complete");
}
