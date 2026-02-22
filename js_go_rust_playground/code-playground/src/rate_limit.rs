use dashmap::DashMap;
use std::time::{Duration, Instant};

/// Sliding-window rate limiter keyed by IP address.
///
/// Design choices:
///   - Sliding window over token bucket: simpler to reason about and implement.
///     For a low-traffic service (< 100 concurrent users), the slight inaccuracy
///     at window boundaries does not matter.
///   - DashMap for lock-free concurrent access per IP.
///   - Lazy cleanup: old entries are pruned during limit checks, not by a
///     background task. Keeps the service minimal.
pub struct RateLimiter {
    /// Maps IP -> list of request timestamps within the window.
    windows: DashMap<String, Vec<Instant>>,
    max_requests: usize,
    window_duration: Duration,
}

impl RateLimiter {
    pub fn new(max_requests: usize, window_duration: Duration) -> Self {
        RateLimiter {
            windows: DashMap::new(),
            max_requests,
            window_duration,
        }
    }

    /// Check if a request from `ip` is allowed.
    /// Returns Ok(remaining) if allowed, Err(retry_after) if rate-limited.
    pub fn check(&self, ip: &str) -> Result<usize, Duration> {
        let now = Instant::now();
        let cutoff = now - self.window_duration;

        let mut entry = self.windows.entry(ip.to_string()).or_insert_with(Vec::new);
        let timestamps = entry.value_mut();

        // Remove expired timestamps (older than the window).
        timestamps.retain(|t| *t > cutoff);

        if timestamps.len() >= self.max_requests {
            // Earliest timestamp in window tells us when a slot opens.
            let oldest = timestamps[0];
            let retry_after = self.window_duration - (now - oldest);
            Err(retry_after)
        } else {
            timestamps.push(now);
            let remaining = self.max_requests - timestamps.len();
            Ok(remaining)
        }
    }

    /// Number of IPs currently tracked (for health endpoint).
    pub fn tracked_ips(&self) -> usize {
        self.windows.len()
    }

    /// Remove stale entries (IPs with no recent requests).
    /// Called periodically from a background task.
    pub fn cleanup(&self) {
        let cutoff = Instant::now() - self.window_duration;
        self.windows.retain(|_ip, timestamps| {
            timestamps.retain(|t| *t > cutoff);
            !timestamps.is_empty()
        });
    }
}
