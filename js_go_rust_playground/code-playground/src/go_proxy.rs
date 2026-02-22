use serde::{Deserialize, Serialize};

// =============================================================
// Go Playground Proxy
//
// Go cannot be embedded — it compiles to native code and requires
// the full Go toolchain (~500MB). There is no "Go interpreter in
// Rust" equivalent to Boa for JavaScript.
//
// Instead, we proxy to go.dev/_/compile, which is the official
// Go Playground API. Same pattern as Rust: validate → cache → proxy.
//
// API endpoint: https://go.dev/_/compile
// Method: POST
// Content-Type: application/x-www-form-urlencoded
// Parameters: version=2&body=<url-encoded Go source>
//
// Response: JSON { Errors: string, Events: [{ Message, Kind, Delay }] }
// =============================================================

/// What we send to go.dev/_/compile.
pub fn build_go_request_body(code: &str) -> String {
    format!(
        "version=2&body={}&withVet=true",
        urlencoding::encode(code)
    )
}

/// What go.dev/_/compile returns.
#[derive(Deserialize, Debug)]
pub struct GoPlaygroundResponse {
    #[serde(rename = "Errors")]
    pub errors: String,
    #[serde(rename = "Events")]
    pub events: Option<Vec<GoEvent>>,
}

#[derive(Deserialize, Debug)]
pub struct GoEvent {
    #[serde(rename = "Message")]
    pub message: String,
    #[serde(rename = "Kind")]
    pub kind: String, // "stdout" or "stderr"
    #[serde(rename = "Delay")]
    pub delay: u64,   // nanoseconds
}

/// Convert the Go Playground response into (stdout, stderr, success).
pub fn parse_go_response(resp: &GoPlaygroundResponse) -> (String, String, bool) {
    if !resp.errors.is_empty() {
        return (String::new(), resp.errors.clone(), false);
    }

    let mut stdout = String::new();
    let mut stderr = String::new();

    if let Some(events) = &resp.events {
        for event in events {
            match event.kind.as_str() {
                "stderr" => stderr.push_str(&event.message),
                _ => stdout.push_str(&event.message),
            }
        }
    }

    (stdout, stderr, true)
}

/// Validate Go code before proxying.
pub fn sanitize_go(code: &str) -> Result<(), &'static str> {
    if code.len() > 10_000 {
        return Err("Code too large (max 10KB)");
    }

    if code.is_empty() {
        return Err("Empty code");
    }

    if !code.contains("package main") {
        return Err("Code must contain 'package main'");
    }

    if !code.contains("func main()") {
        return Err("Code must contain 'func main()'");
    }

    // Block dangerous imports — same philosophy as Rust sanitization.
    let blocked = [
        "\"net/http\"",
        "\"net\"",
        "\"os/exec\"",
        "\"syscall\"",
        "\"unsafe\"",
        "\"plugin\"",
        "\"debug/",
        "\"runtime/cgo\"",
    ];

    for pattern in &blocked {
        if code.contains(pattern) {
            return Err("Code contains blocked import");
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_go_valid() {
        let code = r#"
package main

import "fmt"

func main() {
    fmt.Println("hello")
}
"#;
        assert!(sanitize_go(code).is_ok());
    }

    #[test]
    fn test_sanitize_go_blocks_net() {
        let code = r#"
package main

import "net/http"

func main() {
    http.Get("http://evil.com")
}
"#;
        assert!(sanitize_go(code).is_err());
    }

    #[test]
    fn test_parse_go_response_success() {
        let resp = GoPlaygroundResponse {
            errors: String::new(),
            events: Some(vec![GoEvent {
                message: "hello\n".to_string(),
                kind: "stdout".to_string(),
                delay: 0,
            }]),
        };
        let (stdout, stderr, success) = parse_go_response(&resp);
        assert!(success);
        assert_eq!(stdout, "hello\n");
        assert!(stderr.is_empty());
    }

    #[test]
    fn test_parse_go_response_error() {
        let resp = GoPlaygroundResponse {
            errors: "prog.go:3:1: expected declaration".to_string(),
            events: None,
        };
        let (stdout, stderr, success) = parse_go_response(&resp);
        assert!(!success);
        assert!(stdout.is_empty());
        assert!(stderr.contains("expected declaration"));
    }
}
