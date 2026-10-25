use std::hint::black_box;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};

const CHUNK: u64 = 100_000;

extern "C" {
    fn sched_setaffinity(pid: i32, cpusetsize: usize, mask: *const u64) -> i32;
}

fn pin(cpu: usize) {
    let mut mask = [0u64; 16];
    mask[cpu / 64] |= 1 << (cpu % 64);
    let rc = unsafe { sched_setaffinity(0, std::mem::size_of_val(&mask), mask.as_ptr()) };
    assert_eq!(rc, 0, "sched_setaffinity to cpu {cpu}");
}

fn read_number(path: &str) -> f64 {
    std::fs::read_to_string(path).expect(path).trim().parse().expect("a number")
}

fn coretemp_path(label: &str) -> Option<String> {
    let hwmon = (0..32)
        .map(|i| format!("/sys/class/hwmon/hwmon{i}"))
        .find(|h| std::fs::read_to_string(format!("{h}/name")).is_ok_and(|n| n.trim() == "coretemp"))?;
    (1..128)
        .find(|k| std::fs::read_to_string(format!("{hwmon}/temp{k}_label")).is_ok_and(|l| l.trim() == label))
        .map(|k| format!("{hwmon}/temp{k}_input"))
}

fn celsius(path: &Option<String>) -> f64 {
    path.as_deref().map_or(f64::NAN, |p| read_number(p) / 1000.0)
}

fn spin_chain(cpu: usize, stop: Arc<AtomicBool>, chunks: Arc<AtomicU64>) -> u64 {
    pin(cpu);
    let mut x: u64 = 1;
    while !stop.load(Ordering::Relaxed) {
        for _ in 0..CHUNK {
            x = x.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        }
        chunks.fetch_add(1, Ordering::Relaxed);
    }
    black_box(x)
}

fn spawn_chain(cpu: usize, stop: &Arc<AtomicBool>, chunks: &Arc<AtomicU64>) -> JoinHandle<u64> {
    let (stop, chunks) = (stop.clone(), chunks.clone());
    thread::spawn(move || spin_chain(cpu, stop, chunks))
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let cpu: usize = args[1].parse().expect("worker cpu");
    let sampler_cpu: usize = args[2].parse().expect("sampler cpu");
    let seconds: u64 = args[3].parse().expect("duration in seconds");
    let extra: Vec<usize> = match args.get(4) {
        Some(list) => list.split(',').map(|c| c.parse().expect("cpu number")).collect(),
        None => Vec::new(),
    };
    let phase_ms: u64 = 10_000;
    let freq_path = format!("/sys/devices/system/cpu/cpu{cpu}/cpufreq/scaling_cur_freq");
    let core_id = read_number(&format!("/sys/devices/system/cpu/cpu{cpu}/topology/core_id"));
    let core_temp = coretemp_path(&format!("Core {core_id}"));
    let package_temp = coretemp_path("Package id 0");

    pin(sampler_cpu);
    println!("worker on cpu {cpu}, sampler on cpu {sampler_cpu}, {seconds} s, extra load on {extra:?} in every second phase of 10 s");
    println!(
        "before the start: cpu {cpu} at {:.0} MHz, its core at {:.0} C, package at {:.0} C",
        read_number(&freq_path) / 1000.0,
        celsius(&core_temp),
        celsius(&package_temp)
    );
    println!(
        "{:>8} {:>5} {:>9} {:>7} {:>6} {:>12} {:>15}",
        "time_ms", "load", "freq_MHz", "core_C", "pkg_C", "iter_per_us", "iter_per_cycle"
    );

    let stop = Arc::new(AtomicBool::new(false));
    let chunks = Arc::new(AtomicU64::new(0));
    let start = Instant::now();
    let worker = spawn_chain(cpu, &stop, &chunks);

    let mut extra_stop = Arc::new(AtomicBool::new(false));
    let mut extra_threads = Vec::new();
    let (mut last_t, mut last_chunks) = (start, 0);
    for k in 1u64.. {
        let at_ms = if k <= 100 { 5 * k } else { 500 + 100 * (k - 100) };
        if at_ms > seconds * 1000 {
            break;
        }
        let target = start + Duration::from_millis(at_ms);
        if let Some(wait) = target.checked_duration_since(Instant::now()) {
            thread::sleep(wait);
        }
        let now = Instant::now();
        let c = chunks.load(Ordering::Relaxed);
        let mhz = read_number(&freq_path) / 1000.0;
        let per_us = ((c - last_chunks) * CHUNK) as f64 / now.duration_since(last_t).as_secs_f64() / 1e6;
        let load_on = !extra_threads.is_empty();
        println!(
            "{:>8} {:>5} {:>9.0} {:>7.0} {:>6.0} {:>12.1} {:>15.3}",
            now.duration_since(start).as_millis(),
            if load_on { "on" } else { "off" },
            mhz,
            celsius(&core_temp),
            celsius(&package_temp),
            per_us,
            per_us / mhz
        );
        (last_t, last_chunks) = (now, c);

        let want_on = !extra.is_empty() && (at_ms / phase_ms) % 2 == 1;
        if want_on && !load_on {
            extra_stop = Arc::new(AtomicBool::new(false));
            let ignored = Arc::new(AtomicU64::new(0));
            extra_threads = extra.iter().map(|&c| spawn_chain(c, &extra_stop, &ignored)).collect();
        } else if !want_on && load_on {
            extra_stop.store(true, Ordering::Relaxed);
            for t in extra_threads.drain(..) {
                black_box(t.join().unwrap());
            }
        }
    }
    stop.store(true, Ordering::Relaxed);
    extra_stop.store(true, Ordering::Relaxed);
    black_box(worker.join().unwrap());
    for t in extra_threads {
        black_box(t.join().unwrap());
    }
}
