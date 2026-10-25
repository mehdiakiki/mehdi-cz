use std::hint::black_box;
use std::time::Instant;

#[inline(never)]
fn empty(x: u64) -> u64 {
    black_box(x)
}

fn measure(name: &str, n: u64, mut body: impl FnMut(u64)) {
    let mut per_call: Vec<f64> = (0..7)
        .map(|_| {
            let start = Instant::now();
            for i in 0..n {
                body(i);
            }
            start.elapsed().as_nanos() as f64 / n as f64
        })
        .collect();
    per_call.sort_by(|a, b| a.partial_cmp(b).unwrap());
    println!("  {name:44} {:7.1} ns per call (min {:6.1}, max {:6.1})", per_call[3], per_call[0], per_call[6]);
}

fn main() {
    let n: u64 = std::env::args().nth(1).map_or(1_000_000, |a| a.parse().unwrap());
    measure("empty function call (black_box)", n * 10, |i| {
        black_box(empty(i));
    });
    measure("std::process::id()", n, |_| {
        black_box(std::process::id());
    });
    measure("Instant::now()", n * 10, |_| {
        black_box(Instant::now());
    });
}
