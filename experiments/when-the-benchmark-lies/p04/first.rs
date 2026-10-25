use std::hint::black_box;
use std::time::{Duration, Instant};

const LEN: usize = 64 * 1024;
const FIRST: usize = 50;
const STEADY: usize = 2000;

#[repr(C)]
struct Rusage {
    utime: [i64; 2],
    stime: [i64; 2],
    counters: [i64; 14],
}

extern "C" {
    fn getrusage(who: i32, usage: *mut Rusage) -> i32;
}

fn minor_faults() -> i64 {
    let mut u = Rusage { utime: [0; 2], stime: [0; 2], counters: [0; 14] };
    assert_eq!(unsafe { getrusage(0, &mut u) }, 0);
    u.counters[4]
}

#[inline(never)]
fn work(out: &mut [u64], input: &[u64]) {
    for (o, &x) in out.iter_mut().zip(input) {
        *o = x.wrapping_mul(3).wrapping_add(1);
    }
}

fn spin(d: Duration) {
    let start = Instant::now();
    while start.elapsed() < d {
        black_box(());
    }
}

fn main() {
    let mode = std::env::args().nth(1).unwrap_or_default();
    let input: Vec<u64> = (0..LEN as u64).collect();
    let mut out = vec![0u64; LEN];
    if mode.contains("prefault") {
        out.fill(1);
        black_box(&mut out);
    }
    if mode.contains("evict") {
        let big = black_box(vec![1u8; 64 << 20]);
        black_box(big.iter().map(|&b| b as u64).sum::<u64>());
    }
    if mode.contains("spin") {
        spin(Duration::from_millis(300));
    }
    if mode.contains("sleep") {
        std::thread::sleep(Duration::from_millis(300));
    }
    if mode.contains("touch") {
        black_box(black_box(&input).iter().sum::<u64>() ^ black_box(&out).iter().sum::<u64>());
    }
    if mode == "once" {
        work(black_box(&mut out), black_box(&input));
        return;
    }

    let mut times = Vec::new();
    let mut first_faults = 0;
    for i in 0..FIRST + STEADY {
        let faults = minor_faults();
        let start = Instant::now();
        work(black_box(&mut out), black_box(&input));
        let ns = start.elapsed().as_nanos();
        let faults = minor_faults() - faults;
        if i == 0 {
            first_faults = faults;
        }
        if mode.contains("detail") && (i < 5 || i == 9 || i == 49) {
            println!("iteration {:>2}: {:>8} ns  {:>4} page faults", i + 1, ns, faults);
        }
        times.push(ns);
    }
    let mut steady = times[FIRST..].to_vec();
    steady.sort();
    println!(
        "{mode:<20} iter1 {:>7} ns  faults {first_faults:>3}  iter2 {:>7} ns  iter10 {:>7} ns  steady {:>7} ns",
        times[0],
        times[1],
        times[9],
        steady[STEADY / 2]
    );
}
