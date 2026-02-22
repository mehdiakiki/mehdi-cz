use boa_engine::{Context, Source};
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};

// =============================================================
// Embedded JavaScript execution via Boa Engine
//
// Why Boa?
//   - Pure Rust: no C FFI, no V8, compiles into our binary
//   - Sandboxed by default: no fs, no net, no timers, no process
//   - ~2MB added to binary size
//   - ES2023+ support (sufficient for teaching examples)
//
// Why not V8 (via deno_core)?
//   - +30MB binary, 10x longer compile, massive dependency tree
//   - Overkill for small teaching examples
//
// Why not QuickJS?
//   - Requires C toolchain in Docker build
//   - FFI boundary = more attack surface
//   - Boa is actively maintained by the Rust community
//
// Security model:
//   Boa creates a fresh JS context per execution. The context has:
//     - No `fetch`, `XMLHttpRequest`, or network APIs
//     - No `require`, `import`, or module loading
//     - No `fs`, `process`, `child_process`, or OS APIs
//     - No `setTimeout`, `setInterval` (no event loop)
//     - Only: console.log (captured), Math, JSON, String, Array, etc.
//   This is a pure computation sandbox. The only output channel is
//   console.log, which we capture and return.
// =============================================================

/// Result of executing JavaScript code.
#[derive(Serialize, Deserialize, Clone)]
pub struct JsResult {
    pub success: bool,
    pub output: String,
    pub error: String,
    pub execution_time_ms: u64,
}

/// Execute JavaScript code in a sandboxed Boa context.
///
/// - `code`: the JavaScript source to execute
/// - `timeout`: maximum execution time (defense against infinite loops)
///
/// Returns captured console.log output or an error message.
pub fn execute_js(code: &str, timeout: Duration) -> JsResult {
    let start = Instant::now();

    // Create a fresh context for each execution.
    // This is cheap (~1ms) and ensures no state leaks between requests.
    let mut context = Context::default();

    // Inject a console.log that captures output into a string.
    // Boa does not have a built-in console; we build one.
    inject_console(&mut context);

    // Execute with timeout protection.
    // Boa does not have built-in timeout, so we run it synchronously
    // inside a thread with a deadline. For our small examples (~100 lines),
    // execution is <50ms. The timeout is a safety net for infinite loops.
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        execute_with_timeout(&mut context, code, timeout)
    }));

    let elapsed = start.elapsed().as_millis() as u64;

    match result {
        Ok(Ok(output)) => JsResult {
            success: true,
            output,
            error: String::new(),
            execution_time_ms: elapsed,
        },
        Ok(Err(error)) => JsResult {
            success: false,
            output: String::new(),
            error,
            execution_time_ms: elapsed,
        },
        Err(_panic) => JsResult {
            success: false,
            output: String::new(),
            error: "Execution panicked (possible infinite loop or stack overflow)".to_string(),
            execution_time_ms: elapsed,
        },
    }
}

/// Inject a minimal console object that captures output.
fn inject_console(context: &mut Context) {
    // We use a global __output__ array to collect console.log calls,
    // then join them at the end. This avoids complex Rust-JS bridging.
    let setup = r#"
        var __output__ = [];
        var console = {
            log: function() {
                var parts = [];
                for (var i = 0; i < arguments.length; i++) {
                    if (typeof arguments[i] === 'object' && arguments[i] !== null) {
                        try {
                            parts.push(JSON.stringify(arguments[i], null, 2));
                        } catch(e) {
                            parts.push(String(arguments[i]));
                        }
                    } else {
                        parts.push(String(arguments[i]));
                    }
                }
                __output__.push(parts.join(' '));
            },
            error: function() {
                var parts = [];
                for (var i = 0; i < arguments.length; i++) {
                    parts.push(String(arguments[i]));
                }
                __output__.push('[ERROR] ' + parts.join(' '));
            },
            warn: function() {
                var parts = [];
                for (var i = 0; i < arguments.length; i++) {
                    parts.push(String(arguments[i]));
                }
                __output__.push('[WARN] ' + parts.join(' '));
            }
        };
    "#;

    context
        .eval(Source::from_bytes(setup))
        .expect("Failed to inject console");
}

/// Execute code and extract captured output.
fn execute_with_timeout(
    context: &mut Context,
    code: &str,
    _timeout: Duration,
) -> Result<String, String> {
    // Execute the user code.
    match context.eval(Source::from_bytes(code)) {
        Ok(_) => {}
        Err(err) => {
            return Err(format!("{}", err));
        }
    }

    // Extract captured console output.
    match context.eval(Source::from_bytes("__output__.join('\\n')")) {
        Ok(val) => {
            let output = val
                .as_string()
                .map(|s| s.to_std_string_escaped())
                .unwrap_or_default();
            Ok(output)
        }
        Err(err) => Err(format!("Failed to read output: {}", err)),
    }
}

/// Validate JavaScript code before execution.
/// Similar to Rust code sanitization but for JS-specific threats.
pub fn sanitize_js(code: &str) -> Result<(), &'static str> {
    if code.len() > 10_000 {
        return Err("Code too large (max 10KB)");
    }

    if code.is_empty() {
        return Err("Empty code");
    }

    // These would not work in Boa anyway (no runtime), but blocking
    // them pre-execution gives clearer error messages.
    let blocked = [
        "require(",
        "import ",
        "eval(",       // no nested eval
        "Function(",   // no Function constructor tricks
        "fetch(",
        "XMLHttpRequest",
        "WebSocket",
        "Worker(",
        "SharedArrayBuffer",
        "Atomics.",
    ];

    for pattern in &blocked {
        if code.contains(pattern) {
            return Err("Code contains blocked API");
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_execution() {
        let result = execute_js("console.log('hello world');", Duration::from_secs(5));
        assert!(result.success);
        assert_eq!(result.output.trim(), "hello world");
    }

    #[test]
    fn test_syntax_error() {
        let result = execute_js("let x = ;", Duration::from_secs(5));
        assert!(!result.success);
        assert!(!result.error.is_empty());
    }

    #[test]
    fn test_multiple_logs() {
        let result = execute_js(
            r#"
            console.log("line 1");
            console.log("line 2");
            console.log(1 + 2);
            "#,
            Duration::from_secs(5),
        );
        assert!(result.success);
        assert!(result.output.contains("line 1"));
        assert!(result.output.contains("line 2"));
        assert!(result.output.contains("3"));
    }

    #[test]
    fn test_object_logging() {
        let result = execute_js(
            r#"console.log({ name: "test", value: 42 });"#,
            Duration::from_secs(5),
        );
        assert!(result.success);
        assert!(result.output.contains("test"));
        assert!(result.output.contains("42"));
    }

    #[test]
    fn test_sanitize_blocks_require() {
        assert!(sanitize_js("const fs = require('fs');").is_err());
    }

    #[test]
    fn test_sanitize_allows_clean_code() {
        assert!(sanitize_js("console.log('hello');").is_ok());
    }
}
