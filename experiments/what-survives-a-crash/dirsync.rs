#[allow(dead_code)]
mod common;

use common::{cachestat, disk_stat, percentile};
use std::env;
use std::fs::{self, File};
use std::io::Write;
use std::time::Instant;

const FILES: usize = 200;
const DISK: &str = "nvme0n1";

struct Sync {
    micros: Vec<f64>,
    kib: Vec<f64>,
    flushes: Vec<f64>,
}

impl Sync {
    fn new() -> Self {
        Sync { micros: Vec::new(), kib: Vec::new(), flushes: Vec::new() }
    }

    fn run(&mut self, file: &File) {
        let before = disk_stat(DISK);
        let start = Instant::now();
        file.sync_all().expect("fsync");
        self.micros.push(start.elapsed().as_secs_f64() * 1e6);
        let after = disk_stat(DISK);
        self.kib.push(((after.write_sectors - before.write_sectors) / 2) as f64);
        self.flushes.push((after.flushes - before.flushes) as f64);
    }

    fn report(&mut self, name: &str) {
        for v in [&mut self.micros, &mut self.kib, &mut self.flushes] {
            v.sort_by(|a, b| a.partial_cmp(b).unwrap());
        }
        let us = |v: f64| if v < 10.0 { format!("{v:.1}") } else { format!("{v:.0}") };
        println!(
            "  {name:<15} p50 {:>6} us  p99 {:>6} us  | whole disk, median: {:>3.0} KiB written, {:.0} flushes",
            us(percentile(&self.micros, 50.0)),
            us(percentile(&self.micros, 99.0)),
            percentile(&self.kib, 50.0),
            percentile(&self.flushes, 50.0)
        );
    }
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let (mode, dir_path) = (args[1].as_str(), &args[2]);
    let _ = fs::remove_dir_all(dir_path);
    fs::create_dir(dir_path).expect("mkdir");
    File::open(dir_path).expect("open dir").sync_all().expect("fsync dir");
    let dir = File::open(dir_path).expect("open dir");
    let (mut file_sync, mut dir_sync) = (Sync::new(), Sync::new());
    let mut still_dirty = 0;
    let start = Instant::now();
    for i in 0..FILES {
        let name = format!("{dir_path}/f{i:03}");
        let created = if mode == "rename" { format!("{name}.tmp") } else { name.clone() };
        let mut file = File::create(&created).expect("create");
        file.write_all(&[0x42u8; 4096]).expect("write");
        if mode != "dir-only" {
            file_sync.run(&file);
        }
        if mode == "rename" {
            fs::rename(&created, &name).expect("rename");
        }
        if mode != "file-only" {
            dir_sync.run(&dir);
        }
        if cachestat(&file).nr_dirty > 0 {
            still_dirty += 1;
        }
    }
    let total = start.elapsed().as_secs_f64();
    println!("{mode}: {FILES} new files of 4 KiB, {:.0} files per second", FILES as f64 / total);
    if mode != "dir-only" {
        file_sync.report("fsync(file)");
    }
    if mode != "file-only" {
        dir_sync.report("fsync(dir)");
    }
    println!("  files with dirty data after the syncs: {still_dirty}");
    fs::remove_dir_all(dir_path).expect("cleanup");
}
