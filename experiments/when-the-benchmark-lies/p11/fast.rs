use std::hint::black_box;
use std::time::Instant;

extern "C" {
    fn sched_getcpu() -> i32;
}

fn mix(mut x: u64) -> u64 {
    x ^= x >> 30;
    x = x.wrapping_mul(0xbf58476d1ce4e5b9);
    x ^= x >> 27;
    x = x.wrapping_mul(0x94d049bb133111eb);
    x ^= x >> 31;
    x
}

/// K calls that do not depend on each other.
#[no_mangle]
#[inline(never)]
fn independent(k: u64) -> u64 {
    let mut acc = 0;
    for i in 0..k {
        acc ^= mix(black_box(i));
    }
    acc
}

/// K calls where each one needs the result of the previous one.
#[no_mangle]
#[inline(never)]
fn dependent(k: u64) -> u64 {
    let mut x = 1;
    for _ in 0..k {
        x = mix(x);
    }
    x
}

/// The same loop as `independent`, without the work.
#[no_mangle]
#[inline(never)]
fn empty(k: u64) -> u64 {
    let mut acc = 0;
    for i in 0..k {
        acc ^= black_box(i);
    }
    acc
}

/// Median and minimum of `samples` timings of f(k), in ns per call.
fn measure(k: u64, samples: usize, f: fn(u64) -> u64) -> (f64, f64) {
    let mut ns: Vec<f64> = (0..samples)
        .map(|_| {
            let start = Instant::now();
            black_box(f(black_box(k)));
            start.elapsed().as_nanos() as f64 / k as f64
        })
        .collect();
    ns.sort_by(f64::total_cmp);
    (ns[samples / 2], ns[0])
}

fn main() {
    for f in [independent, dependent, empty] {
        measure(1000, 10_000, f);
    }
    println!("{:>9} {:>8}   {:>22}   {:>22}   {:>22}", "K", "samples", "independent", "dependent", "empty loop");
    for k in [1u64, 10, 100, 1_000, 1_000_000] {
        let samples = if k <= 1000 { 100_000 } else { 101 };
        let (im, imin) = measure(k, samples, independent);
        let (dm, dmin) = measure(k, samples, dependent);
        let (em, emin) = measure(k, samples, empty);
        println!(
            "{k:>9} {samples:>8}   median {im:>6.2} min {imin:>6.2}   median {dm:>6.2} min {dmin:>6.2}   median {em:>6.2} min {emin:>6.2}"
        );
    }
    let cpu = unsafe { sched_getcpu() };
    let path = format!("/sys/devices/system/cpu/cpu{cpu}/cpufreq/scaling_cur_freq");
    let khz = std::fs::read_to_string(path).expect("read scaling_cur_freq");
    println!("cpu {cpu} at {} MHz right after the run", khz.trim().parse::<u64>().expect("number") / 1000);
}
