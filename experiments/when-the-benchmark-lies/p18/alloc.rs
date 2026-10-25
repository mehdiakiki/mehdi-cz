use std::alloc::{GlobalAlloc, Layout, System};
use std::cell::Cell;
use std::fmt::Write;
use std::hint::black_box;
use std::sync::Barrier;
use std::sync::atomic::{AtomicU8, AtomicU64, Ordering};
use std::thread;
use std::time::Instant;

#[path = "../harness.rs"]
mod harness;

const BIG: usize = 256 * 1024;

/// The system allocator, counting the calls to alloc in one counter for the
/// whole process, in one counter per thread, or not at all.
struct Counting;

const OFF: u8 = 0;
const SHARED: u8 = 1;
const PER_THREAD: u8 = 2;

static COUNTER: AtomicU8 = AtomicU8::new(SHARED);
static ALLOCS: AtomicU64 = AtomicU64::new(0);

thread_local! {
    static THREAD_ALLOCS: Cell<u64> = const { Cell::new(0) };
}

unsafe impl GlobalAlloc for Counting {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        match COUNTER.load(Ordering::Relaxed) {
            SHARED => {
                ALLOCS.fetch_add(1, Ordering::Relaxed);
            }
            PER_THREAD => THREAD_ALLOCS.with(|n| n.set(n.get() + 1)),
            _ => {}
        }
        unsafe { System.alloc(layout) }
    }
    unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
        unsafe { System.dealloc(ptr, layout) }
    }
}

#[global_allocator]
static GLOBAL: Counting = Counting;

#[repr(C)]
struct Rusage {
    utime: [i64; 2],
    stime: [i64; 2],
    counters: [i64; 14],
}

extern "C" {
    fn getrusage(who: i32, usage: *mut Rusage) -> i32;
    fn sched_setaffinity(pid: i32, size: usize, mask: *const u64) -> i32;
    fn sched_getcpu() -> i32;
}

/// Allows the calling thread to run only on this CPU.
fn pin(cpu: usize) {
    let mut mask = [0u64; 16];
    mask[cpu / 64] |= 1 << (cpu % 64);
    assert_eq!(unsafe { sched_setaffinity(0, size_of_val(&mask), mask.as_ptr()) }, 0);
}

/// The current frequency of a CPU in MHz, as the kernel reports it.
fn mhz(cpu: usize) -> f64 {
    let path = format!("/sys/devices/system/cpu/cpu{cpu}/cpufreq/scaling_cur_freq");
    let khz: f64 = std::fs::read_to_string(path).expect("read scaling_cur_freq").trim().parse().expect("number");
    khz / 1000.0
}

/// The allocations counted so far, by the counter that is in use.
fn allocs() -> u64 {
    match COUNTER.load(Ordering::Relaxed) {
        SHARED => ALLOCS.load(Ordering::Relaxed),
        PER_THREAD => THREAD_ALLOCS.with(Cell::get),
        _ => 0,
    }
}

fn minor_faults() -> i64 {
    let mut u = Rusage { utime: [0; 2], stime: [0; 2], counters: [0; 14] };
    assert_eq!(unsafe { getrusage(0, &mut u) }, 0);
    u.counters[4]
}

fn record_new(id: u64) -> usize {
    let s = format!("id={id} name=user{} score={}", id % 1000, id * 7 % 101);
    s.len()
}

fn record_reuse(buf: &mut String, id: u64) -> usize {
    buf.clear();
    write!(buf, "id={id} name=user{} score={}", id % 1000, id * 7 % 101).unwrap();
    buf.len()
}

fn big_new(id: u64) -> u64 {
    let mut v = Vec::with_capacity(BIG);
    v.extend((0..BIG).map(|i| (i as u64 ^ id) as u8));
    v.iter().map(|&b| b as u64).sum()
}

fn big_reuse(v: &mut Vec<u8>, id: u64) -> u64 {
    v.clear();
    v.extend((0..BIG).map(|i| (i as u64 ^ id) as u8));
    v.iter().map(|&b| b as u64).sum()
}

fn median(samples: &[f64]) -> f64 {
    let mut s = samples.to_vec();
    s.sort_by(f64::total_cmp);
    harness::quantile(&s, 0.5)
}

/// Median ns per call, allocations per call and page faults per call.
fn measure(iters: u64, mut f: impl FnMut(u64) -> u64) -> (f64, f64, f64) {
    let bench = harness::Bench { warmup: iters, samples: 21, iters };
    let mut id = 0u64;
    let ns = median(&bench.run((), |_| {
        id += 1;
        f(id)
    }));
    let (a0, p0) = (allocs(), minor_faults());
    for i in 0..iters {
        black_box(f(i));
    }
    let allocs = (allocs() - a0) as f64 / iters as f64;
    let faults = (minor_faults() - p0) as f64 / iters as f64;
    (ns, allocs, faults)
}

fn main() {
    let mode = std::env::args().nth(1).unwrap_or_default();
    match mode.as_str() {
        "single" => {
            let faults = minor_faults();
            let start = Instant::now();
            black_box(big_new(0));
            let ns = start.elapsed().as_nanos();
            println!("first call of 256 KiB, new Vec, in a fresh process: {ns} ns, {} page faults", minor_faults() - faults);
            let mut buf = String::new();
            let mut big = Vec::new();
            let rows: [(&str, (f64, f64, f64)); 4] = [
                ("small, new String", measure(100_000, |id| record_new(id) as u64)),
                ("small, reused buffer", measure(100_000, |id| record_reuse(&mut buf, id) as u64)),
                ("256 KiB, new Vec", measure(200, big_new)),
                ("256 KiB, reused Vec", measure(200, |id| big_reuse(&mut big, id))),
            ];
            println!("{:<22} {:>12} {:>16} {:>18}", "version", "ns per call", "allocs per call", "page faults per call");
            for (name, (ns, allocs, faults)) in rows {
                println!("{name:<22} {ns:>12.1} {allocs:>16.2} {faults:>18.2}");
            }
        }
        "strace" => {
            let which = std::env::args().nth(2).expect("new or reuse");
            let mut big = Vec::new();
            for id in 0..1000 {
                if which == "new" {
                    black_box(big_new(id));
                } else {
                    black_box(big_reuse(&mut big, id));
                }
            }
        }
        "threads" => {
            let list = std::env::args().nth(2).expect("CPUs, like 0,2,4,6");
            let cpus: Vec<usize> = list.split(',').map(|c| c.parse().expect("CPU number")).collect();
            let counter = std::env::args().nth(3).expect("shared, per-thread or off");
            let (mode, label) = match counter.as_str() {
                "shared" => (SHARED, "shared counter"),
                "per-thread" => (PER_THREAD, "counter per thread"),
                "off" => (OFF, "no counter"),
                other => panic!("unknown counter {}", other),
            };
            COUNTER.store(mode, Ordering::Relaxed);
            let barrier = Barrier::new(cpus.len());
            let results: Vec<([(f64, f64, f64); 2], f64)> = thread::scope(|s| {
                let handles: Vec<_> = cpus
                    .iter()
                    .map(|&cpu| {
                        let barrier = &barrier;
                        s.spawn(move || {
                            pin(cpu);
                            let mut buf = String::new();
                            barrier.wait();
                            let new = measure(100_000, |id| record_new(id) as u64);
                            barrier.wait();
                            let reuse = measure(100_000, |id| record_reuse(&mut buf, id) as u64);
                            assert_eq!(unsafe { sched_getcpu() }, cpu as i32);
                            ([new, reuse], mhz(cpu))
                        })
                    })
                    .collect();
                handles.into_iter().map(|h| h.join().unwrap()).collect()
            });
            let column = |version: usize, value: fn(&(f64, f64, f64)) -> f64| {
                median(&results.iter().map(|r| value(&r.0[version])).collect::<Vec<_>>())
            };
            let freq = median(&results.iter().map(|r| r.1).collect::<Vec<_>>());
            let threads = if cpus.len() == 1 { "thread on CPU" } else { "threads on CPUs" };
            let mut line = format!(
                "{} {threads} {list}, {label}: new String {:.1} ns, reused buffer {:.1} ns per call",
                cpus.len(),
                column(0, |r| r.0),
                column(1, |r| r.0)
            );
            if mode == PER_THREAD {
                write!(line, ", {:.2} and {:.2} allocs per call", column(0, |r| r.1), column(1, |r| r.1)).unwrap();
            }
            println!("{line}, {freq:.0} MHz at the end");
        }
        other => panic!("unknown mode {}", other),
    }
}
