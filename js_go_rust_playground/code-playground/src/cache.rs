use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, Instant};
use tracing;

// =============================================================
// Two-tier cache: memory (DashMap) + disk (JSON file)
//
// Why not Redis?
//   1. Redis adds a container, a TCP hop, serialization overhead,
//      and a new failure mode — all for < 100 cache entries.
//   2. Our hot path (pre-loaded examples) is 8 entries. DashMap
//      lookup is ~50ns. Redis round-trip is ~500µs. 10,000x slower.
//   3. We only need persistence across restarts, not across machines.
//      A JSON file on a Docker volume does exactly that.
//   4. Fewer moving parts = fewer things to secure, monitor, debug.
//
// When WOULD you use Redis?
//   - Multiple replicas sharing state
//   - Cache entries in the thousands+
//   - Need pub/sub or complex eviction policies
//   - Need atomic operations on cache values
//
// This is a real tradeoff question in interviews.
// =============================================================

/// Serializable entry for disk persistence.
#[derive(Clone, Serialize, Deserialize)]
pub struct DiskEntry {
    pub response_body: String,
    pub example_id: String,
}

/// In-memory entry with Instant for TTL.
struct MemoryEntry {
    response_body: String,
    inserted_at: Instant,
    example_id: String,
    /// Pre-loaded examples never expire.
    is_default: bool,
}

pub struct CompilationCache {
    memory: DashMap<String, MemoryEntry>,
    modified_ttl: Duration,
    disk_path: PathBuf,

    hits: AtomicU64,
    misses: AtomicU64,
    disk_loads: AtomicU64,
}

impl CompilationCache {
    pub fn new(modified_ttl: Duration, disk_path: PathBuf) -> Self {
        let cache = CompilationCache {
            memory: DashMap::new(),
            modified_ttl,
            disk_path,
            hits: AtomicU64::new(0),
            misses: AtomicU64::new(0),
            disk_loads: AtomicU64::new(0),
        };
        cache.load_from_disk();
        cache
    }

    /// Deterministic cache key from compilation parameters.
    pub fn cache_key(code: &str, mode: &str, edition: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(code.as_bytes());
        hasher.update(b"|");
        hasher.update(mode.as_bytes());
        hasher.update(b"|");
        hasher.update(edition.as_bytes());
        hex::encode(hasher.finalize())
    }

    /// Look up a cached result. Returns None if missing or expired.
    pub fn get(&self, code: &str, mode: &str, edition: &str) -> Option<String> {
        let key = Self::cache_key(code, mode, edition);

        if let Some(entry) = self.memory.get(&key) {
            if entry.is_default || entry.inserted_at.elapsed() < self.modified_ttl {
                self.hits.fetch_add(1, Ordering::Relaxed);
                return Some(entry.response_body.clone());
            }
            drop(entry);
            self.memory.remove(&key);
        }

        self.misses.fetch_add(1, Ordering::Relaxed);
        None
    }

    /// Store a compilation result.
    pub fn insert(
        &self,
        code: &str,
        mode: &str,
        edition: &str,
        response: String,
        example_id: &str,
        is_default: bool,
    ) {
        let key = Self::cache_key(code, mode, edition);
        self.memory.insert(
            key,
            MemoryEntry {
                response_body: response,
                inserted_at: Instant::now(),
                example_id: example_id.to_string(),
                is_default,
            },
        );

        // Only persist default examples — not user-modified code (privacy).
        if is_default {
            self.save_to_disk();
        }
    }

    /// Persist default example results to disk (survives container restarts).
    fn save_to_disk(&self) {
        let entries: Vec<(String, DiskEntry)> = self
            .memory
            .iter()
            .filter(|e| e.value().is_default)
            .map(|e| {
                (
                    e.key().clone(),
                    DiskEntry {
                        response_body: e.value().response_body.clone(),
                        example_id: e.value().example_id.clone(),
                    },
                )
            })
            .collect();

        if entries.is_empty() {
            return;
        }

        // Write to temp file first, then rename — atomic on most filesystems.
        // Prevents corrupt cache files if the process is killed mid-write.
        let tmp_path = self.disk_path.with_extension("tmp");
        match serde_json::to_string(&entries) {
            Ok(json) => {
                if let Err(e) = std::fs::write(&tmp_path, &json) {
                    tracing::warn!("Failed to write cache temp file: {}", e);
                    return;
                }
                if let Err(e) = std::fs::rename(&tmp_path, &self.disk_path) {
                    tracing::warn!("Failed to rename cache file: {}", e);
                    return;
                }
                tracing::debug!("Persisted {} default entries to disk", entries.len());
            }
            Err(e) => tracing::warn!("Failed to serialize cache: {}", e),
        }
    }

    /// Load cached results from disk on startup.
    fn load_from_disk(&self) {
        if !self.disk_path.exists() {
            tracing::info!("No persistent cache at {:?}, will warm from playground", self.disk_path);
            return;
        }

        match std::fs::read_to_string(&self.disk_path) {
            Ok(json) => match serde_json::from_str::<Vec<(String, DiskEntry)>>(&json) {
                Ok(entries) => {
                    let count = entries.len();
                    for (key, entry) in entries {
                        self.memory.insert(
                            key,
                            MemoryEntry {
                                response_body: entry.response_body,
                                inserted_at: Instant::now(),
                                example_id: entry.example_id,
                                is_default: true,
                            },
                        );
                    }
                    self.disk_loads.fetch_add(count as u64, Ordering::Relaxed);
                    tracing::info!("Loaded {} cached entries from disk", count);
                }
                Err(e) => tracing::warn!("Failed to parse cache file: {}", e),
            },
            Err(e) => tracing::warn!("Failed to read cache file: {}", e),
        }
    }

    /// Evict expired user-modified entries.
    pub fn evict_expired(&self) {
        let before = self.memory.len();
        self.memory.retain(|_key, entry| {
            entry.is_default || entry.inserted_at.elapsed() < self.modified_ttl
        });
        let evicted = before - self.memory.len();
        if evicted > 0 {
            tracing::debug!("Evicted {} expired cache entries", evicted);
        }
    }

    pub fn stats(&self) -> CacheStats {
        let total = self.memory.len();
        let defaults = self.memory.iter().filter(|e| e.value().is_default).count();
        let h = self.hits.load(Ordering::Relaxed);
        let m = self.misses.load(Ordering::Relaxed);

        CacheStats {
            total_entries: total,
            default_entries: defaults,
            modified_entries: total - defaults,
            hits: h,
            misses: m,
            disk_loads: self.disk_loads.load(Ordering::Relaxed),
            hit_rate_pct: if h + m > 0 {
                (h as f64 / (h + m) as f64 * 100.0).round() as u64
            } else {
                0
            },
        }
    }
}

#[derive(Serialize)]
pub struct CacheStats {
    pub total_entries: usize,
    pub default_entries: usize,
    pub modified_entries: usize,
    pub hits: u64,
    pub misses: u64,
    pub disk_loads: u64,
    pub hit_rate_pct: u64,
}
