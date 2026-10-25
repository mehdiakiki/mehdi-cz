#[allow(dead_code)]
mod common;

use common::{DiskStat, disk_stat, percentile};
use std::env;
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::os::unix::fs::{FileExt, OpenOptionsExt};
use std::time::Instant;

const BLOCK: usize = 4096;
const ROUNDS: usize = 1000;
const O_DSYNC: i32 = 0o10000;
const DISK: &str = "nvme0n1";

struct Round {
    micros: f64,
    kib: u64,
    flushes: u64,
}

fn delta(before: &DiskStat, after: &DiskStat) -> (u64, u64) {
    ((after.write_sectors - before.write_sectors) / 2, after.flushes - before.flushes)
}

fn open(mode: &str, path: &str) -> File {
    let _ = fs::remove_file(path);
    let mut options = OpenOptions::new();
    options.write(true).create(true);
    if mode == "dsync" {
        options.custom_flags(O_DSYNC);
    }
    let mut file = options.open(path).expect("open");
    if mode == "overwrite-fdatasync" {
        for _ in 0..ROUNDS {
            file.write_all(&[0u8; BLOCK]).expect("prefill");
        }
        file.sync_all().expect("fsync prefill");
    }
    if mode == "flush-only" {
        file.write_all(&[0u8; BLOCK]).expect("prefill");
        file.sync_all().expect("fsync prefill");
    }
    file
}

fn one_round(mode: &str, file: &mut File, round: usize, block: &[u8]) {
    match mode {
        "append-fsync" => {
            file.write_all(block).expect("write");
            file.sync_all().expect("fsync");
        }
        "append-fdatasync" => {
            file.write_all(block).expect("write");
            file.sync_data().expect("fdatasync");
        }
        "overwrite-fdatasync" => {
            file.write_all_at(block, (round * BLOCK) as u64).expect("pwrite");
            file.sync_data().expect("fdatasync");
        }
        "dsync" => file.write_all(block).expect("write"),
        "flush-only" => file.sync_data().expect("fdatasync"),
        _ => panic!("unknown mode {mode}"),
    }
}

fn label(micros: f64) -> String {
    match micros {
        m if m < 1.0 => format!("{m:.2}"),
        m if m < 10.0 => format!("{m:.1}"),
        m => format!("{m:.0}"),
    }
}

fn histogram(sorted: &[f64]) {
    let mut low = 2f64.powi(sorted[0].log2().floor() as i32);
    while low <= sorted[sorted.len() - 1] {
        let high = low * 2.0;
        let count = sorted.iter().filter(|&&t| t >= low && t < high).count();
        let bar = "#".repeat(count.div_ceil(10));
        println!("  {:>7} - {:<7} us {:>5}  {}", label(low), label(high), count, bar);
        low = high;
    }
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let (mode, path) = (&args[1], &args[2]);
    let block = vec![0x5au8; BLOCK];
    let mut file = open(mode, path);
    let mut rounds = Vec::with_capacity(ROUNDS);
    let first = disk_stat(DISK);
    let start = Instant::now();
    for round in 0..ROUNDS {
        let before = disk_stat(DISK);
        let t = Instant::now();
        one_round(mode, &mut file, round, &block);
        let micros = t.elapsed().as_secs_f64() * 1e6;
        let (kib, flushes) = delta(&before, &disk_stat(DISK));
        rounds.push(Round { micros, kib, flushes });
    }
    let total = start.elapsed().as_secs_f64();
    let (kib, flushes) = delta(&first, &disk_stat(DISK));
    fs::remove_file(path).expect("remove");

    let mut times: Vec<f64> = rounds.iter().map(|r| r.micros).collect();
    times.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let what = if mode == "flush-only" { "fdatasync with nothing to write" } else { "4 KiB" };
    println!("{mode}: {ROUNDS} rounds of {what}, {:.0} rounds per second", ROUNDS as f64 / total);
    println!(
        "  min {} us, p50 {} us, p90 {} us, p99 {} us, max {} us",
        label(times[0]),
        label(percentile(&times, 50.0)),
        label(percentile(&times, 90.0)),
        label(percentile(&times, 99.0)),
        label(times[ROUNDS - 1])
    );
    println!("  whole disk during the loop: {flushes} flushes, {kib} KiB written");
    histogram(&times);
    rounds.sort_by(|a, b| b.micros.partial_cmp(&a.micros).unwrap());
    let typical = &rounds[ROUNDS / 2];
    println!(
        "  median round: {} us, whole disk during it: {} KiB written, {} flushes",
        label(typical.micros),
        typical.kib,
        typical.flushes
    );
    for r in &rounds[..5] {
        println!(
            "  slow round:   {} us, whole disk during it: {} KiB written, {} flushes",
            label(r.micros),
            r.kib,
            r.flushes
        );
    }
}
