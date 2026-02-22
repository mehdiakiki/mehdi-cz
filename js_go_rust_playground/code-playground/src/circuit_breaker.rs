use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::RwLock;
use std::time::{Duration, Instant};
use tracing;

// =============================================================
// Circuit Breaker with Stale-While-Revalidate
//
// play.rust-lang.org and go.dev WILL go down. When they do,
// the naive approach makes every user wait 30 seconds for a
// timeout, then shows an error. That is terrible UX.
//
// The circuit breaker pattern:
//
//   CLOSED (normal)
//     → request succeeds → stay CLOSED
//     → request fails → increment failure count
//     → failures >= threshold → transition to OPEN
//
//   OPEN (rejecting requests)
//     → immediately return error (no waiting!)
//     → after cooldown period → transition to HALF_OPEN
//
//   HALF_OPEN (testing recovery)
//     → send ONE probe request
//     → if it succeeds → transition to CLOSED
//     → if it fails → transition back to OPEN
//
// Combined with stale-while-revalidate:
//   When the circuit is OPEN and we have a stale cached response,
//   return the stale data with an X-Cache: Stale header instead
//   of failing completely. Most users will never notice the
//   upstream is down because the default examples are cached.
//
// Interview flex:
//   "When play.rust-lang.org had a 45-minute outage, my service
//    continued serving cached results. Users didn't notice."
// =============================================================

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum CircuitState {
    Closed,
    Open,
    HalfOpen,
}

impl std::fmt::Display for CircuitState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CircuitState::Closed => write!(f, "closed"),
            CircuitState::Open => write!(f, "open"),
            CircuitState::HalfOpen => write!(f, "half_open"),
        }
    }
}

pub struct CircuitBreaker {
    name: String,
    state: RwLock<CircuitState>,
    /// Consecutive failure count (resets on success).
    failure_count: AtomicU64,
    /// How many consecutive failures trigger the circuit to open.
    failure_threshold: u64,
    /// How long the circuit stays open before allowing a probe.
    cooldown: Duration,
    /// When the circuit last opened.
    opened_at: RwLock<Option<Instant>>,

    // Stats
    total_successes: AtomicU64,
    total_failures: AtomicU64,
    total_rejections: AtomicU64,
}

impl CircuitBreaker {
    pub fn new(name: &str, failure_threshold: u64, cooldown: Duration) -> Self {
        CircuitBreaker {
            name: name.to_string(),
            state: RwLock::new(CircuitState::Closed),
            failure_count: AtomicU64::new(0),
            failure_threshold,
            cooldown,
            opened_at: RwLock::new(None),
            total_successes: AtomicU64::new(0),
            total_failures: AtomicU64::new(0),
            total_rejections: AtomicU64::new(0),
        }
    }

    /// Check if a request is allowed through.
    /// Returns Ok(()) if allowed, Err(CircuitState::Open) if rejected.
    pub fn allow_request(&self) -> Result<(), CircuitState> {
        let state = *self.state.read().unwrap();

        match state {
            CircuitState::Closed => Ok(()),
            CircuitState::HalfOpen => {
                // In half-open, we allow exactly one probe request.
                // For simplicity, we allow all requests in half-open
                // but transition back to open on failure.
                Ok(())
            }
            CircuitState::Open => {
                // Check if cooldown has elapsed.
                let opened_at = self.opened_at.read().unwrap();
                if let Some(opened) = *opened_at {
                    if opened.elapsed() >= self.cooldown {
                        // Transition to half-open: allow a probe.
                        drop(opened_at);
                        *self.state.write().unwrap() = CircuitState::HalfOpen;
                        tracing::info!(
                            circuit = %self.name,
                            "Circuit breaker → HALF_OPEN (cooldown elapsed, allowing probe)"
                        );
                        return Ok(());
                    }
                }

                self.total_rejections.fetch_add(1, Ordering::Relaxed);
                Err(CircuitState::Open)
            }
        }
    }

    /// Record a successful request.
    pub fn record_success(&self) {
        self.failure_count.store(0, Ordering::Relaxed);
        self.total_successes.fetch_add(1, Ordering::Relaxed);

        let prev_state = *self.state.read().unwrap();
        if prev_state != CircuitState::Closed {
            *self.state.write().unwrap() = CircuitState::Closed;
            *self.opened_at.write().unwrap() = None;
            tracing::info!(
                circuit = %self.name,
                prev_state = %prev_state,
                "Circuit breaker → CLOSED (upstream recovered)"
            );
        }
    }

    /// Record a failed request.
    pub fn record_failure(&self) {
        let failures = self.failure_count.fetch_add(1, Ordering::Relaxed) + 1;
        self.total_failures.fetch_add(1, Ordering::Relaxed);

        if failures >= self.failure_threshold {
            let prev_state = *self.state.read().unwrap();
            *self.state.write().unwrap() = CircuitState::Open;
            *self.opened_at.write().unwrap() = Some(Instant::now());
            tracing::warn!(
                circuit = %self.name,
                failures = failures,
                threshold = self.failure_threshold,
                cooldown_secs = self.cooldown.as_secs(),
                prev_state = %prev_state,
                "Circuit breaker → OPEN (failure threshold reached)"
            );
        }
    }

    /// Current state for health endpoint.
    pub fn state(&self) -> CircuitState {
        *self.state.read().unwrap()
    }

    /// Stats for health endpoint.
    pub fn stats(&self) -> CircuitBreakerStats {
        CircuitBreakerStats {
            name: self.name.clone(),
            state: format!("{}", self.state()),
            failure_count: self.failure_count.load(Ordering::Relaxed),
            failure_threshold: self.failure_threshold,
            cooldown_secs: self.cooldown.as_secs(),
            total_successes: self.total_successes.load(Ordering::Relaxed),
            total_failures: self.total_failures.load(Ordering::Relaxed),
            total_rejections: self.total_rejections.load(Ordering::Relaxed),
        }
    }
}

#[derive(serde::Serialize)]
pub struct CircuitBreakerStats {
    pub name: String,
    pub state: String,
    pub failure_count: u64,
    pub failure_threshold: u64,
    pub cooldown_secs: u64,
    pub total_successes: u64,
    pub total_failures: u64,
    pub total_rejections: u64,
}
