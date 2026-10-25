#[allow(dead_code)]
mod common;

use common::{cachestat, disk_stat, meminfo_kb, self_io, vmstat};
use std::env;
use std::fs::{self, File};
use std::io::Write;
use std::thread;
use std::time::{Duration, Instant};

const CHUNK: usize = 1 << 20;
const CHUNKS: usize = 256;
const DISK: &str = "nvme0n1";

fn write_file(path: &str, chunks: usize) -> (File, Duration) {
    let _ = fs::remove_file(path);
    let mut file = File::create(path).expect("create");
    let buf = vec![0xabu8; CHUNK];
    let start = Instant::now();
    for _ in 0..chunks {
        file.write_all(&buf).expect("write");
    }
    (file, start.elapsed())
}

fn ms(d: Duration) -> f64 {
    d.as_secs_f64() * 1000.0
}

fn with_fsync(path: &str) {
    let dirty0 = meminfo_kb("Dirty");
    let (wchar0, wbytes0) = (self_io("wchar"), self_io("write_bytes"));
    let disk0 = disk_stat(DISK);
    let (file, write_time) = write_file(path, CHUNKS);
    let dirty1 = meminfo_kb("Dirty");
    let page1 = cachestat(&file);
    let (wchar1, wbytes1) = (self_io("wchar"), self_io("write_bytes"));
    let disk1 = disk_stat(DISK);
    let start = Instant::now();
    file.sync_all().expect("fsync");
    let fsync_time = start.elapsed();
    let dirty2 = meminfo_kb("Dirty");
    let page2 = cachestat(&file);
    let (wchar2, wbytes2) = (self_io("wchar"), self_io("write_bytes"));
    let disk2 = disk_stat(DISK);

    println!("Dirty before write:  {dirty0:>9} kB");
    println!("Dirty after write:   {dirty1:>9} kB");
    println!("Dirty after fsync:   {dirty2:>9} kB");
    println!("file dirty pages after write: {:>6}, after fsync: {}", page1.nr_dirty, page2.nr_dirty);
    println!(
        "wchar grew by:       {:>9} after write, {:>9} after fsync",
        wchar1 - wchar0,
        wchar2 - wchar0
    );
    println!(
        "write_bytes grew by: {:>9} after write, {:>9} after fsync",
        wbytes1 - wbytes0,
        wbytes2 - wbytes0
    );
    println!(
        "disk during write: {} sectors written, {} flushes",
        disk1.write_sectors - disk0.write_sectors,
        disk1.flushes - disk0.flushes
    );
    println!(
        "disk during fsync: {} sectors written, {} flushes",
        disk2.write_sectors - disk1.write_sectors,
        disk2.flushes - disk1.flushes
    );
    println!("{CHUNKS} write() calls: {:>8.1} ms", ms(write_time));
    println!("one fsync():     {:>8.1} ms", ms(fsync_time));
}

fn reclaim_scans() -> u64 {
    vmstat("pgscan_kswapd") + vmstat("pgscan_direct")
}

fn without_fsync(path: &str, seconds: u64, chunks: usize) {
    let dirty0 = meminfo_kb("Dirty");
    let (file, write_time) = write_file(path, chunks);
    let start = Instant::now();
    let (mut written, mut scans) = (vmstat("nr_written"), reclaim_scans());
    println!("Dirty before write: {dirty0} kB, {chunks} write() calls of 1 MiB: {:.1} ms, no fsync", ms(write_time));
    println!("  t   Dirty kB  file dirty pages  pages written  reclaim scans");
    for second in 0..=seconds {
        let target = Duration::from_secs(second);
        if let Some(wait) = target.checked_sub(start.elapsed()) {
            thread::sleep(wait);
        }
        let page = cachestat(&file);
        let (written_now, scans_now) = (vmstat("nr_written"), reclaim_scans());
        println!(
            "{:>3}  {:>9}  {:>16}  {:>13}  {:>13}",
            second,
            meminfo_kb("Dirty"),
            page.nr_dirty,
            written_now - written,
            scans_now - scans
        );
        (written, scans) = (written_now, scans_now);
    }
}

fn main() {
    let args: Vec<String> = env::args().collect();
    match args.get(1).map(String::as_str) {
        Some("fsync") => with_fsync(&args[2]),
        Some("series") => without_fsync(&args[2], args[3].parse().unwrap(), args[4].parse().unwrap()),
        _ => {
            eprintln!("usage: dirty fsync PATH | dirty series PATH SECONDS MIB");
            std::process::exit(2);
        }
    }
}
