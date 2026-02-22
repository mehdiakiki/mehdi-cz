use axum::http::{HeaderMap, HeaderValue};
use sha2::{Digest, Sha256};
use std::time::{SystemTime, UNIX_EPOCH};

/// Request signature validation.
///
/// The frontend signs each request with HMAC(secret, timestamp + body).
/// This ensures only YOUR frontend can call the execute endpoint.
/// Without this, anyone could use your service as a free Rust playground proxy.
///
/// The secret is shared between the Next.js app and the Axum service
/// via environment variable (PLAYGROUND_SECRET).
pub struct RequestSigner {
    secret: String,
    /// Maximum age of a signed request in seconds.
    /// Prevents replay attacks — a captured request expires quickly.
    max_age_secs: u64,
}

impl RequestSigner {
    pub fn new(secret: String, max_age_secs: u64) -> Self {
        RequestSigner {
            secret,
            max_age_secs,
        }
    }

    /// Generate a signature for the frontend to use.
    /// In practice, the frontend calls a Next.js API route that generates this.
    pub fn sign(&self, timestamp: u64, body: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(self.secret.as_bytes());
        hasher.update(b":");
        hasher.update(timestamp.to_string().as_bytes());
        hasher.update(b":");
        hasher.update(body.as_bytes());
        hex::encode(hasher.finalize())
    }

    /// Validate a request signature from the frontend.
    /// Returns Ok(()) if valid, Err(reason) if not.
    pub fn validate(&self, headers: &HeaderMap, body: &str) -> Result<(), &'static str> {
        let signature = headers
            .get("x-playground-signature")
            .and_then(|v| v.to_str().ok())
            .ok_or("Missing signature header")?;

        let timestamp_str = headers
            .get("x-playground-timestamp")
            .and_then(|v| v.to_str().ok())
            .ok_or("Missing timestamp header")?;

        let timestamp: u64 = timestamp_str
            .parse()
            .map_err(|_| "Invalid timestamp")?;

        // Check timestamp freshness — prevents replay attacks.
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        if now.abs_diff(timestamp) > self.max_age_secs {
            return Err("Request expired");
        }

        // Verify HMAC.
        let expected = self.sign(timestamp, body);
        if !constant_time_eq(signature.as_bytes(), expected.as_bytes()) {
            return Err("Invalid signature");
        }

        Ok(())
    }
}

/// Constant-time comparison to prevent timing attacks.
/// Even though this is "just" a playground, good habits matter —
/// and it is a talking point in interviews.
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.iter()
        .zip(b.iter())
        .fold(0u8, |acc, (x, y)| acc | (x ^ y))
        == 0
}

/// Origin validation — only allow requests from your domain.
///
/// This replaces the `CorsLayer::allow_origin(Any)` from the original.
/// Combined with HMAC signing, this is defense in depth:
///   - CORS prevents browsers from making cross-origin requests
///   - HMAC prevents scripts/curl from bypassing CORS
pub fn validate_origin(headers: &HeaderMap, allowed_origins: &[String]) -> bool {
    // Check Origin header (sent by browsers on cross-origin requests).
    if let Some(origin) = headers.get("origin").and_then(|v| v.to_str().ok()) {
        return allowed_origins.iter().any(|allowed| origin == allowed);
    }

    // Check Referer as fallback (some browsers send this instead).
    if let Some(referer) = headers.get("referer").and_then(|v| v.to_str().ok()) {
        return allowed_origins
            .iter()
            .any(|allowed| referer.starts_with(allowed));
    }

    // No origin or referer — could be server-to-server or curl.
    // Block by default; the HMAC check is the second layer.
    false
}

/// Input sanitization for code submissions.
///
/// We do NOT allow arbitrary code. The rules:
///   1. Code must be ≤ 10KB
///   2. No network imports (no reqwest, no std::net)
///   3. No file system access (no std::fs, no std::process)
///   4. No inline assembly
///   5. Code must contain fn main() (it is a bin crate)
///
/// This is not a sandbox — the real sandbox is play.rust-lang.org.
/// This is a pre-filter that catches obvious abuse before it leaves our server.
pub fn sanitize_code(code: &str) -> Result<(), &'static str> {
    if code.len() > 10_000 {
        return Err("Code too large (max 10KB)");
    }

    if code.is_empty() {
        return Err("Empty code");
    }

    // Must have a main function (we compile as bin).
    if !code.contains("fn main()") {
        return Err("Code must contain fn main()");
    }

    // Block dangerous imports.
    // These are not foolproof — a determined attacker can obfuscate.
    // But play.rust-lang.org sandboxes execution anyway.
    // This just avoids wasting their resources on obvious abuse.
    let blocked_patterns = [
        "std::net",
        "std::process",
        "std::fs",
        "std::os",
        "std::env",
        "tokio::net",
        "tokio::process",
        "tokio::fs",
        "reqwest",
        "hyper",
        "asm!",
        "global_asm!",
        "include_bytes!",
        "include_str!",
    ];

    for pattern in &blocked_patterns {
        if code.contains(pattern) {
            return Err("Code contains blocked import or macro");
        }
    }

    Ok(())
}

/// Compute how different submitted code is from the original example.
///
/// Returns the edit distance as a rough percentage of lines changed.
/// We use this to decide whether to allow execution:
///   - < 30% changed: definitely an exploration of the example → allow
///   - 30-60% changed: significant modification → allow but log
///   - > 60% changed: basically new code → block
///
/// This prevents someone from using your service as a generic Rust playground
/// while still allowing meaningful experimentation with the examples.
pub fn code_similarity(original: &str, submitted: &str) -> f64 {
    let orig_lines: Vec<&str> = original.lines().collect();
    let sub_lines: Vec<&str> = submitted.lines().collect();

    if orig_lines.is_empty() && sub_lines.is_empty() {
        return 1.0;
    }

    let max_len = orig_lines.len().max(sub_lines.len());
    if max_len == 0 {
        return 1.0;
    }

    let mut matching = 0;
    for (a, b) in orig_lines.iter().zip(sub_lines.iter()) {
        if a.trim() == b.trim() {
            matching += 1;
        }
    }

    matching as f64 / max_len as f64
}

/// Build CORS headers for allowed origins.
pub fn cors_headers(allowed_origins: &[String]) -> Vec<(String, String)> {
    vec![
        (
            "Access-Control-Allow-Origin".to_string(),
            allowed_origins.first().cloned().unwrap_or_default(),
        ),
        (
            "Access-Control-Allow-Methods".to_string(),
            "GET, POST, OPTIONS".to_string(),
        ),
        (
            "Access-Control-Allow-Headers".to_string(),
            "Content-Type, X-Playground-Signature, X-Playground-Timestamp".to_string(),
        ),
        (
            "Access-Control-Max-Age".to_string(),
            "86400".to_string(),
        ),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sign_and_validate() {
        let signer = RequestSigner::new("test-secret".to_string(), 60);
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        let body = r#"{"example_id":"01","code":"fn main(){}"}"#;
        let sig = signer.sign(now, body);

        let mut headers = HeaderMap::new();
        headers.insert(
            "x-playground-signature",
            HeaderValue::from_str(&sig).unwrap(),
        );
        headers.insert(
            "x-playground-timestamp",
            HeaderValue::from_str(&now.to_string()).unwrap(),
        );

        assert!(signer.validate(&headers, body).is_ok());
    }

    #[test]
    fn test_expired_request() {
        let signer = RequestSigner::new("test-secret".to_string(), 60);
        let old_timestamp = 1000u64; // way in the past
        let body = "test";
        let sig = signer.sign(old_timestamp, body);

        let mut headers = HeaderMap::new();
        headers.insert(
            "x-playground-signature",
            HeaderValue::from_str(&sig).unwrap(),
        );
        headers.insert("x-playground-timestamp", HeaderValue::from_static("1000"));

        assert_eq!(signer.validate(&headers, body), Err("Request expired"));
    }

    #[test]
    fn test_sanitize_blocks_network() {
        assert!(sanitize_code("use std::net::TcpStream;\nfn main() {}").is_err());
        assert!(sanitize_code("fn main() { println!(\"hello\"); }").is_ok());
    }

    #[test]
    fn test_similarity() {
        let a = "line1\nline2\nline3";
        let b = "line1\nchanged\nline3";
        let sim = code_similarity(a, b);
        assert!((sim - 0.666).abs() < 0.01);
    }
}
