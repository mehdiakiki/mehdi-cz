use std::hint::black_box;
use std::time::Instant;

const N: usize = 4_000_000;
const PR_SET_THP_DISABLE: i32 = 41;

#[repr(C)]
struct Rusage {
    utime: [i64; 2],
    stime: [i64; 2],
    counters: [i64; 14],
}

extern "C" {
    fn prctl(option: i32, arg2: u64, arg3: u64, arg4: u64, arg5: u64) -> i32;
    fn getrusage(who: i32, usage: *mut Rusage) -> i32;
}

fn minor_faults() -> i64 {
    let mut u = Rusage { utime: [0; 2], stime: [0; 2], counters: [0; 14] };
    assert_eq!(unsafe { getrusage(0, &mut u) }, 0);
    u.counters[4]
}

fn anon_huge_pages() -> String {
    let rollup = std::fs::read_to_string("/proc/self/smaps_rollup").expect("read smaps_rollup");
    let line = rollup.lines().find(|l| l.starts_with("AnonHugePages:")).expect("AnonHugePages line");
    line.split_whitespace().skip(1).collect::<Vec<_>>().join(" ")
}

fn quantile(sorted: &[u32], q: f64) -> u32 {
    sorted[((sorted.len() - 1) as f64 * q).round() as usize]
}

fn histogram(times: &[u32]) {
    let mut buckets = [0u64; 33];
    for &t in times {
        buckets[(32 - t.max(1).leading_zeros()) as usize] += 1;
    }
    for (b, &count) in buckets.iter().enumerate() {
        if count > 0 {
            let bar = "#".repeat((count as f64).log10().floor() as usize * 4 + 1);
            println!("  {:>9} - {:>9} ns  {:>8}  {bar}", 1u64 << (b - 1), (1u64 << b) - 1, count);
        }
    }
}

fn main() {
    let mode = std::env::args().nth(1).expect("mode: grow, reserved or touched, optionally with ,nothp");
    if mode.contains("nothp") {
        assert_eq!(unsafe { prctl(PR_SET_THP_DISABLE, 1, 0, 0, 0) }, 0, "prctl");
    }
    let mut times = vec![0u32; N];
    let mut v: Vec<u64> = if mode.starts_with("grow") {
        Vec::new()
    } else if mode.starts_with("reserved") {
        Vec::with_capacity(N)
    } else {
        let mut v = vec![1u64; N];
        black_box(&mut v);
        v.clear();
        v
    };
    let mut grew = Vec::new();
    let faults_before = minor_faults();
    for i in 0..N {
        let cap = v.capacity();
        let start = Instant::now();
        v.push(black_box(i as u64));
        let ns = start.elapsed().as_nanos() as u32;
        times[i] = ns;
        if v.capacity() != cap {
            grew.push(i);
        }
    }
    let faults = minor_faults() - faults_before;
    black_box(&v);

    let total: u64 = times.iter().map(|&t| t as u64).sum();
    let mut sorted = times.clone();
    sorted.sort();
    println!(
        "{mode}: {N} pushes, {} reallocations, {faults} page faults, AnonHugePages {}, total {:.1} ms",
        grew.len(),
        anon_huge_pages(),
        total as f64 / 1e6
    );
    println!(
        "  mean {:.1} ns  median {} ns  p90 {} ns  p99 {} ns  p99.9 {} ns  p99.99 {} ns  max {} ns",
        total as f64 / N as f64,
        quantile(&sorted, 0.5),
        quantile(&sorted, 0.9),
        quantile(&sorted, 0.99),
        quantile(&sorted, 0.999),
        quantile(&sorted, 0.9999),
        sorted[N - 1]
    );
    let slow_total: u64 = sorted[N - N / 1000..].iter().map(|&t| t as u64).sum();
    println!("  the slowest 0.1% of pushes take {:.1}% of the total time", 100.0 * slow_total as f64 / total as f64);
    if !grew.is_empty() {
        let realloc: u64 = grew.iter().map(|&i| times[i] as u64).sum();
        println!("  the {} reallocating pushes take {:.1}% of the total time", grew.len(), 100.0 * realloc as f64 / total as f64);
        let last: Vec<String> = grew.iter().rev().take(4).map(|&i| format!("push {} took {} ns", i, times[i])).collect();
        println!("  last reallocations: {}", last.join(", "));
    }
    histogram(&times);
}
