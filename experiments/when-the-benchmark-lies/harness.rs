//! A small timing harness: a warm-up, then `samples` samples, and each sample
//! times `iters` calls with `Instant`. Results are in nanoseconds per call.

#![allow(dead_code)]

use std::hint::black_box;
use std::time::Instant;

pub struct Bench {
    pub warmup: u64,
    pub samples: usize,
    pub iters: u64,
}

impl Bench {
    /// Calls `f(input)` and returns one value per sample, in ns per call.
    pub fn run<I: Copy, O>(&self, input: I, mut f: impl FnMut(I) -> O) -> Vec<f64> {
        for _ in 0..self.warmup {
            black_box(f(black_box(input)));
        }
        let mut ns_per_call = Vec::with_capacity(self.samples);
        for _ in 0..self.samples {
            let start = Instant::now();
            for _ in 0..self.iters {
                black_box(f(black_box(input)));
            }
            let ns = start.elapsed().as_nanos() as f64;
            ns_per_call.push(ns / self.iters as f64);
        }
        ns_per_call
    }
}

/// The value at index round((n - 1) q) of sorted values, `q` between 0 and 1.
pub fn quantile(sorted: &[f64], q: f64) -> f64 {
    sorted[((sorted.len() - 1) as f64 * q).round() as usize]
}

/// Prints min, median, p90 and max, and writes the raw samples to
/// `$RAW_DIR/<name>.txt` when RAW_DIR is set.
pub fn report(name: &str, samples: &[f64]) {
    let mut s = samples.to_vec();
    s.sort_by(f64::total_cmp);
    println!(
        "{name:<18} min {:>9.3}  median {:>9.3}  p90 {:>9.3}  max {:>9.3}  ns/call  (n={})",
        s[0],
        quantile(&s, 0.5),
        quantile(&s, 0.9),
        s[s.len() - 1],
        s.len()
    );
    if let Ok(dir) = std::env::var("RAW_DIR") {
        let text: String = samples.iter().map(|v| format!("{v:.3}\n")).collect();
        std::fs::write(format!("{dir}/{name}.txt"), text).expect("write raw samples");
    }
}
