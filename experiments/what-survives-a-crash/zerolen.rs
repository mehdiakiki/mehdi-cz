#[allow(dead_code)]
mod common;

use common::cachestat;
use std::env;
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::thread;
use std::time::{Duration, Instant};

const MIB: usize = 16;
const DELALLOC: &str = "/sys/fs/ext4/nvme0n1p2/delayed_allocation_blocks";

fn delalloc() -> u64 {
    fs::read_to_string(DELALLOC).expect("read delalloc counter").trim().parse().unwrap()
}

fn show(label: &str, file: &File) {
    let stat = cachestat(file);
    println!(
        "  {label:<26} dirty pages {:>5}, writeback pages {:>5}, ext4 delayed blocks {:>6}",
        stat.nr_dirty,
        stat.nr_writeback,
        delalloc()
    );
}

fn fill(file: &mut File) {
    let chunk = vec![0x6bu8; 1 << 20];
    for _ in 0..MIB {
        file.write_all(&chunk).expect("write");
    }
}

fn old_file(path: &str) {
    let mut file = File::create(path).expect("create old");
    file.write_all(b"old content\n").expect("write old");
    file.sync_all().expect("fsync old");
}

fn timed<F: FnOnce()>(what: &str, f: F) {
    let start = Instant::now();
    f();
    println!("  {what} took {:.0} us", start.elapsed().as_secs_f64() * 1e6);
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let (mode, dir) = (args[1].as_str(), &args[2]);
    let _ = fs::remove_dir_all(dir);
    fs::create_dir(dir).expect("mkdir");
    let target = format!("{dir}/target");
    let tmp = format!("{dir}/target.tmp");
    println!("{mode}: {MIB} MiB written without fsync");
    match mode {
        "rename-over" | "rename-new" => {
            if mode == "rename-over" {
                old_file(&target);
            }
            let mut file = File::create(&tmp).expect("create tmp");
            fill(&mut file);
            show("after the writes", &file);
            timed("rename", || fs::rename(&tmp, &target).expect("rename"));
            show("right after rename", &file);
            thread::sleep(Duration::from_secs(1));
            show("one second later", &file);
        }
        "truncate" | "new-file" => {
            if mode == "truncate" {
                old_file(&target);
            }
            let mut file = OpenOptions::new().write(true).create(true).truncate(true).open(&target).expect("open");
            let reader = File::open(&target).expect("open reader");
            fill(&mut file);
            show("after the writes", &reader);
            timed("close", || drop(file));
            show("right after close", &reader);
            thread::sleep(Duration::from_secs(1));
            show("one second later", &reader);
        }
        _ => panic!("unknown mode {mode}"),
    }
    fs::remove_dir_all(dir).expect("cleanup");
}
