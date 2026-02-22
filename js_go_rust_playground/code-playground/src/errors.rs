use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;

// =============================================================
// RFC 7807: Problem Details for HTTP APIs
//
// Why this matters:
//   The naive approach: { "error": "something broke" }
//   The production approach: a structured, machine-readable error
//   that tells the consumer EXACTLY what went wrong, where to
//   read about it, and how to trace it.
//
// Every error from this service is a ProblemDetail. The frontend
// can parse `type` to show contextual help. The trace_id connects
// the error to the OpenTelemetry trace for debugging.
//
// Spec: https://www.rfc-editor.org/rfc/rfc7807
// =============================================================

/// RFC 7807 Problem Details response.
#[derive(Serialize)]
pub struct ProblemDetail {
    /// A URI reference that identifies the problem type.
    /// Points to human-readable documentation.
    #[serde(rename = "type")]
    pub problem_type: String,

    /// A short, human-readable summary.
    pub title: String,

    /// The HTTP status code.
    pub status: u16,

    /// A human-readable explanation specific to this occurrence.
    pub detail: String,

    /// The OpenTelemetry trace ID for this request.
    /// Lets you jump from a user-reported error directly to the trace.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trace_id: Option<String>,

    /// The example ID, if relevant.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub example_id: Option<String>,
}

impl ProblemDetail {
    pub fn new(status: StatusCode, problem_type: &str, title: &str, detail: String) -> Self {
        ProblemDetail {
            problem_type: format!("https://api.yourdomain.com/errors/{}", problem_type),
            title: title.to_string(),
            status: status.as_u16(),
            detail,
            trace_id: current_trace_id(),
            example_id: None,
        }
    }

    pub fn with_example(mut self, example_id: &str) -> Self {
        self.example_id = Some(example_id.to_string());
        self
    }

    // --- Factory methods for common errors ---

    pub fn unauthorized(detail: String) -> Self {
        Self::new(StatusCode::UNAUTHORIZED, "unauthorized", "Unauthorized", detail)
    }

    pub fn forbidden(detail: String) -> Self {
        Self::new(StatusCode::FORBIDDEN, "forbidden", "Forbidden", detail)
    }

    pub fn bad_request(detail: String) -> Self {
        Self::new(StatusCode::BAD_REQUEST, "bad-request", "Bad Request", detail)
    }

    pub fn rate_limited(retry_after_secs: u64) -> Self {
        Self::new(
            StatusCode::TOO_MANY_REQUESTS,
            "rate-limited",
            "Rate Limited",
            format!("Too many requests. Retry in {} seconds.", retry_after_secs),
        )
    }

    pub fn execution_timeout(language: &str, timeout_ms: u64) -> Self {
        Self::new(
            StatusCode::REQUEST_TIMEOUT,
            "execution-timeout",
            "Execution Timed Out",
            format!(
                "The {} execution exceeded the {}ms limit.",
                language, timeout_ms
            ),
        )
    }

    pub fn upstream_unavailable(service: &str) -> Self {
        Self::new(
            StatusCode::SERVICE_UNAVAILABLE,
            "upstream-unavailable",
            "Upstream Service Unavailable",
            format!(
                "{} is temporarily unavailable. The circuit breaker is open. \
                 Cached results may be served with a staleness warning.",
                service
            ),
        )
    }

    pub fn upstream_error(service: &str, detail: String) -> Self {
        Self::new(
            StatusCode::BAD_GATEWAY,
            "upstream-error",
            "Upstream Error",
            format!("{}: {}", service, detail),
        )
    }

    pub fn similarity_rejected(similarity_pct: u64, example_id: &str) -> Self {
        Self::new(
            StatusCode::BAD_REQUEST,
            "similarity-rejected",
            "Code Too Different",
            format!(
                "Submitted code is only {}% similar to example '{}'. \
                 This playground is for exploring the provided examples, \
                 not running arbitrary code.",
                similarity_pct, example_id
            ),
        )
        .with_example(example_id)
    }

    pub fn code_blocked(reason: &str) -> Self {
        Self::new(
            StatusCode::BAD_REQUEST,
            "code-blocked",
            "Code Rejected",
            format!("Code sanitization failed: {}", reason),
        )
    }

    pub fn internal(detail: String) -> Self {
        Self::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            "internal-error",
            "Internal Server Error",
            detail,
        )
    }
}

/// Convert ProblemDetail into an Axum response with correct content type.
impl IntoResponse for ProblemDetail {
    fn into_response(self) -> Response {
        let status = StatusCode::from_u16(self.status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        let mut response = (status, Json(self)).into_response();

        // RFC 7807 requires this content type.
        response.headers_mut().insert(
            "content-type",
            "application/problem+json".parse().unwrap(),
        );

        response
    }
}

/// Extract the current OpenTelemetry trace ID from the tracing span.
fn current_trace_id() -> Option<String> {
    use opentelemetry::trace::TraceContextExt;
    use tracing::Span;
    use tracing_opentelemetry::OpenTelemetrySpanExt;

    let span = Span::current();
    let ctx = span.context();
    let otel_ctx = ctx.span().span_context().clone();

    if !otel_ctx.is_valid() {
        None
    } else {
        Some(otel_ctx.trace_id().to_string())
    }
}
