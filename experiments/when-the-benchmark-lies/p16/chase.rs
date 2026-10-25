use std::hint::black_box;
use std::time::Instant;

const STEPS: usize = 4_000_000;
const PR_SET_THP_DISABLE: i32 = 41;

extern "C" {
    fn prctl(option: i32, arg2: u64, arg3: u64, arg4: u64, arg5: u64) -> i32;
}

fn next(state: &mut u64) -> u64 {
    *state ^= *state << 13;
    *state ^= *state >> 7;
    *state ^= *state << 17;
    *state
}

/// A random permutation that is one single cycle (Sattolo's algorithm).
fn cycle(n: usize, rng: &mut u64) -> Vec<usize> {
    let mut a: Vec<usize> = (0..n).collect();
    for i in (1..n).rev() {
        let j = (next(rng) % i as u64) as usize;
        a.swap(i, j);
    }
    a
}

/// ns per step of i = a[i], the median of 3 measurements of STEPS steps.
fn chase(a: &[usize]) -> f64 {
    let mut i = 0;
    for _ in 0..a.len().min(STEPS) {
        i = a[i];
    }
    let mut ns: Vec<f64> = (0..3)
        .map(|_| {
            let start = Instant::now();
            for _ in 0..STEPS {
                i = a[i];
            }
            start.elapsed().as_nanos() as f64 / STEPS as f64
        })
        .collect();
    black_box(i);
    ns.sort_by(f64::total_cmp);
    ns[1]
}

/// ns per element of a sequential sum of the whole array.
fn sequential(a: &[usize]) -> f64 {
    let reps = (64 << 20) / a.len().max(1) + 1;
    let start = Instant::now();
    let mut s = 0usize;
    for _ in 0..reps {
        s = s.wrapping_add(black_box(a).iter().sum::<usize>());
    }
    black_box(s);
    start.elapsed().as_nanos() as f64 / (reps * a.len()) as f64
}

fn anon_huge_kb() -> u64 {
    let rollup = std::fs::read_to_string("/proc/self/smaps_rollup").expect("read smaps_rollup");
    let line = rollup.lines().find(|l| l.starts_with("AnonHugePages:")).expect("AnonHugePages");
    line.split_whitespace().nth(1).expect("value").parse().expect("number")
}

fn main() {
    let mode = std::env::args().nth(1).unwrap_or_default();
    if mode == "nothp" {
        assert_eq!(unsafe { prctl(PR_SET_THP_DISABLE, 1, 0, 0, 0) }, 0, "prctl");
    }
    println!("{:>10} {:>14} {:>16} {:>15}", "size", "chase ns/step", "sequential ns/el", "AnonHugePages");
    let mut rng = 0x2545f4914f6cdd1d_u64;
    for k in 0..=32 {
        let kib = (4.0 * 2f64.powf(k as f64 / 2.0)).round();
        let n = (kib * 1024.0 / 8.0) as usize;
        let a = cycle(n, &mut rng);
        let c = chase(&a);
        let s = sequential(&a);
        let label = if kib < 1024.0 { format!("{kib:.0} KiB") } else { format!("{:.1} MiB", kib / 1024.0) };
        println!("{label:>10} {c:>14.2} {s:>16.3} {:>12} kB", anon_huge_kb());
        drop(a);
    }
}
