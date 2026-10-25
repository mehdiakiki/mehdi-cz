use std::hint::black_box;
use std::time::{Duration, Instant};

#[path = "../harness.rs"]
mod harness;

const LEN: usize = 4096;
const ITERS: u64 = 1_000_000;

fn sum(data: &[u64]) -> u64 {
    data.iter().sum()
}

#[inline(never)]
fn sum_outlined(data: &[u64]) -> u64 {
    data.iter().sum()
}

#[no_mangle]
#[inline(never)]
fn bench_unused(data: &[u64], iters: u64) -> Duration {
    let start = Instant::now();
    for _ in 0..iters {
        sum(data);
    }
    start.elapsed()
}

#[no_mangle]
#[inline(never)]
fn bench_printed(data: &[u64], iters: u64) -> (Duration, u64) {
    let start = Instant::now();
    let mut total: u64 = 0;
    for _ in 0..iters {
        total = total.wrapping_add(sum(data));
    }
    (start.elapsed(), total)
}

#[no_mangle]
#[inline(never)]
fn bench_printed_outlined(data: &[u64], iters: u64) -> (Duration, u64) {
    let start = Instant::now();
    let mut total: u64 = 0;
    for _ in 0..iters {
        total = total.wrapping_add(sum_outlined(data));
    }
    (start.elapsed(), total)
}

#[no_mangle]
#[inline(never)]
fn bench_black_box(data: &[u64], iters: u64) -> Duration {
    let start = Instant::now();
    for _ in 0..iters {
        black_box(sum(black_box(data)));
    }
    start.elapsed()
}

fn show(name: &str, d: Duration) {
    let per_call = d.as_nanos() as f64 / ITERS as f64;
    println!("{name:<17} total {:>11} ns  {:>11.5} ns per call", d.as_nanos(), per_call);
}

fn main() {
    let data: Vec<u64> = (0..LEN as u64).collect();
    println!("sum of {LEN} u64 values, {ITERS} calls per line");

    show("unused result", bench_unused(&data, ITERS));
    let (d, total) = bench_printed(&data, ITERS);
    show("printed", d);
    println!("{:<17} total of the sums {total}", "");
    let (d, total) = bench_printed_outlined(&data, ITERS);
    show("printed, outlined", d);
    println!("{:<17} total of the sums {total}", "");
    show("black_box", bench_black_box(&data, ITERS));

    let bench = harness::Bench { warmup: 10_000, samples: 31, iters: 10_000 };
    let samples = bench.run(&data[..], sum);
    harness::report("harness_sum", &samples);
}
