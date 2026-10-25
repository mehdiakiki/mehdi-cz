use std::hint::black_box;
use std::time::Instant;

const REQUESTS: usize = 20_000;
const PAGE: usize = 10;

fn next(state: &mut u64) -> u64 {
    *state ^= *state << 13;
    *state ^= *state >> 7;
    *state ^= *state << 17;
    *state
}

fn hash(data: &[u32], seed: u64) -> u64 {
    data.iter().fold(seed, |h, &x| (h ^ x as u64).wrapping_mul(0x100000001b3))
}

/// The normal path hashes 256 values. One request in a hundred also hashes
/// 2,000,000 more values.
fn handle(request: u64, small: &[u32], table: &[u32], rng: &mut u64) -> u64 {
    let mut h = hash(small, request);
    if next(rng) % 100 == 0 {
        h ^= hash(table, h);
    }
    h
}

fn quantile(sorted: &[f64], q: f64) -> f64 {
    sorted[((sorted.len() - 1) as f64 * q).round() as usize]
}

fn main() {
    let small: Vec<u32> = (0..256).collect();
    let table: Vec<u32> = (0..2_000_000).collect();
    let mut rng = 0x2545f4914f6cdd1d_u64;
    let mut us = Vec::with_capacity(REQUESTS);
    for r in 0..REQUESTS {
        let start = Instant::now();
        black_box(handle(black_box(r as u64), &small, &table, &mut rng));
        us.push(start.elapsed().as_nanos() as f64 / 1000.0);
    }

    let mean = us.iter().sum::<f64>() / REQUESTS as f64;
    let mut sorted = us.clone();
    sorted.sort_by(f64::total_cmp);
    println!("{REQUESTS} requests, times in microseconds");
    println!(
        "  mean {mean:.1}  median {:.1}  p90 {:.1}  p99 {:.1}  p99.9 {:.1}  max {:.1}",
        quantile(&sorted, 0.5),
        quantile(&sorted, 0.9),
        quantile(&sorted, 0.99),
        quantile(&sorted, 0.999),
        sorted[REQUESTS - 1]
    );
    let slow = us.iter().filter(|&&t| t > 100.0).count();
    let near_mean = us.iter().filter(|&&t| t > mean / 2.0 && t < mean * 2.0).count();
    println!("  requests over 100 us: {slow}; requests between half and twice the mean: {near_mean}");
    let pages = REQUESTS / PAGE;
    let slow_pages = us.chunks(PAGE).filter(|p| p.iter().any(|&t| t > 100.0)).count();
    println!(
        "  pages of {PAGE} requests that contain at least one request over 100 us: {slow_pages} of {pages} ({:.1}%)",
        100.0 * slow_pages as f64 / pages as f64
    );
}
