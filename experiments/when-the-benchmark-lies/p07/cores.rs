use std::sync::{Arc, Barrier};
use std::thread;

#[path = "../harness.rs"]
mod harness;

const LEN: usize = 2048;
const CHAIN: u64 = 10_000;
const K: u64 = 6364136223846793005;
const C: u64 = 1442695040888963407;

extern "C" {
    fn sched_setaffinity(pid: i32, cpusetsize: usize, mask: *const u64) -> i32;
    fn sched_getcpu() -> i32;
}

fn pin(cpu: usize) {
    let mut mask = [0u64; 16];
    mask[cpu / 64] |= 1 << (cpu % 64);
    let rc = unsafe { sched_setaffinity(0, std::mem::size_of_val(&mask), mask.as_ptr()) };
    assert_eq!(rc, 0, "sched_setaffinity to cpu {cpu}");
}

fn current_cpu() -> i32 {
    unsafe { sched_getcpu() }
}

/// The other hardware thread of the same core, if there is one.
fn sibling(cpu: usize) -> Option<usize> {
    let path = format!("/sys/devices/system/cpu/cpu{cpu}/topology/thread_siblings_list");
    let list = std::fs::read_to_string(path).expect("read thread_siblings_list");
    let mut ends = list.trim().split(['-', ',']).map(|c| c.parse::<usize>().expect("cpu number"));
    let (first, last) = (ends.next()?, ends.last()?);
    Some(if first == cpu { last } else { first })
}

/// Total and idle ticks of one cpu, from /proc/stat.
fn ticks(cpu: usize) -> (u64, u64) {
    let stat = std::fs::read_to_string("/proc/stat").expect("read /proc/stat");
    let line = stat.lines().find(|l| l.starts_with(&format!("cpu{cpu} "))).expect("cpu line");
    let v: Vec<u64> = line.split_whitespace().skip(1).take(8).map(|x| x.parse().expect("number")).collect();
    (v.iter().sum(), v[3] + v[4])
}

fn cur_mhz(cpu: usize) -> u64 {
    let path = format!("/sys/devices/system/cpu/cpu{cpu}/cpufreq/scaling_cur_freq");
    let khz: u64 = std::fs::read_to_string(path).expect("read scaling_cur_freq").trim().parse().expect("number");
    khz / 1000
}

fn sum(data: &[u64]) -> u64 {
    data.iter().sum()
}

fn chain(seed: u64) -> u64 {
    let mut x = seed;
    for _ in 0..CHAIN {
        x = x.wrapping_mul(K).wrapping_add(C);
    }
    x
}

fn median(samples: &[f64]) -> f64 {
    let mut s = samples.to_vec();
    s.sort_by(f64::total_cmp);
    harness::quantile(&s, 0.5)
}

/// Median ns per call of the sum and of the chain, on the current thread.
/// With a barrier, both measurements start together with the other thread.
fn measure(barrier: Option<&Barrier>) -> (f64, f64) {
    let data: Vec<u64> = (0..LEN as u64).collect();
    let bench_sum = harness::Bench { warmup: 400_000, samples: 31, iters: 2_000 };
    let bench_chain = harness::Bench { warmup: 50_000, samples: 31, iters: 50 };
    barrier.map(Barrier::wait);
    let s = median(&bench_sum.run(&data[..], sum));
    barrier.map(Barrier::wait);
    let c = median(&bench_chain.run(1u64, chain));
    (s, c)
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    match args[1].as_str() {
        "pinned" => {
            let cpu: usize = args[2].parse().expect("cpu");
            pin(cpu);
            let sib = sibling(cpu);
            let before = sib.map(ticks);
            let (s, c) = measure(None);
            let mhz = cur_mhz(cpu);
            let busy = match (sib, before) {
                (Some(other), Some((t0, i0))) => {
                    let (t1, i1) = ticks(other);
                    let pct = 100.0 * (1.0 - (i1 - i0) as f64 / (t1 - t0).max(1) as f64);
                    format!("  sibling cpu {other} busy {pct:3.0}%")
                }
                _ => String::new(),
            };
            println!("cpu {cpu:>2}           sum {s:>8.1} ns  chain {c:>8.1} ns  {mhz} MHz after{busy}");
        }
        "unpinned" => {
            let before = current_cpu();
            let (s, c) = measure(None);
            let after = current_cpu();
            let mhz = cur_mhz(after as usize);
            println!("cpu {before:>2} then {after:>2}   sum {s:>8.1} ns  chain {c:>8.1} ns  {mhz} MHz after");
        }
        "pair" => {
            let cpus: Vec<usize> = args[2..4].iter().map(|c| c.parse().expect("cpu")).collect();
            let barrier = Arc::new(Barrier::new(2));
            let handles: Vec<_> = cpus
                .iter()
                .map(|&cpu| {
                    let barrier = barrier.clone();
                    thread::spawn(move || {
                        pin(cpu);
                        measure(Some(&barrier))
                    })
                })
                .collect();
            let results: Vec<(f64, f64)> = handles.into_iter().map(|h| h.join().unwrap()).collect();
            for (&cpu, (s, c)) in cpus.iter().zip(&results) {
                let mhz = cur_mhz(cpu);
                println!("pair {}+{} cpu {cpu:>2}  sum {s:>8.1} ns  chain {c:>8.1} ns  {mhz} MHz after", cpus[0], cpus[1]);
            }
        }
        "consts" => {
            let (mut a, mut b) = (1u64, 0u64);
            for _ in 0..8 {
                a = a.wrapping_mul(K);
                b = b.wrapping_mul(K).wrapping_add(C);
            }
            println!("8 turns of x * K + C are x * {a} + {b}, that is x * {} + {} as signed numbers", a as i64, b as i64);
        }
        other => panic!("unknown mode {}", other),
    }
}
