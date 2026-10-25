#[allow(dead_code)]
mod common;

use common::{cachestat, disk_stat, major_faults, meminfo_kb, minor_faults};
use std::env;
use std::fs::{self, File, OpenOptions};
use std::os::fd::AsRawFd;
use std::thread;
use std::time::{Duration, Instant};

const PAGE: usize = 4096;
const PROT_READ: i32 = 1;
const PROT_WRITE: i32 = 2;
const MAP_SHARED: i32 = 1;
const MS_SYNC: i32 = 4;
const DISK: &str = "nvme0n1";

unsafe extern "C" {
    fn mmap(addr: *mut u8, len: usize, prot: i32, flags: i32, fd: i32, offset: i64) -> *mut u8;
    fn msync(addr: *mut u8, len: usize, flags: i32) -> i32;
    fn munmap(addr: *mut u8, len: usize) -> i32;
}

struct Mapping {
    ptr: *mut u8,
    len: usize,
}

impl Mapping {
    fn new(file: &File, len: usize) -> Mapping {
        let ptr = unsafe { mmap(std::ptr::null_mut(), len, PROT_READ | PROT_WRITE, MAP_SHARED, file.as_raw_fd(), 0) };
        assert!(ptr as isize != -1, "mmap failed: {}", std::io::Error::last_os_error());
        Mapping { ptr, len }
    }

    fn fill(&self) {
        for index in 0..self.len / PAGE {
            let page = unsafe { std::slice::from_raw_parts_mut(self.ptr.add(index * PAGE), PAGE) };
            page.fill(0x6d);
            page[..8].copy_from_slice(&(index as u64).to_le_bytes());
        }
    }
}

impl Drop for Mapping {
    fn drop(&mut self) {
        unsafe { munmap(self.ptr, self.len) };
    }
}

fn create(path: &str, mib: usize) -> File {
    let _ = fs::remove_file(path);
    let file = OpenOptions::new().read(true).write(true).create(true).open(path).expect("create");
    file.set_len((mib << 20) as u64).expect("ftruncate");
    file
}

fn ms(start: Instant) -> f64 {
    start.elapsed().as_secs_f64() * 1000.0
}

fn sync_test(path: &str, mib: usize, how: &str) {
    let file = create(path, mib);
    let map = Mapping::new(&file, mib << 20);
    let dirty0 = meminfo_kb("Dirty");
    let (minor0, major0) = (minor_faults(), major_faults());
    let start = Instant::now();
    map.fill();
    let fill_ms = ms(start);
    let (minor, major) = (minor_faults() - minor0, major_faults() - major0);
    let dirty1 = meminfo_kb("Dirty");
    let after_fill = cachestat(&file).nr_dirty;
    let disk0 = disk_stat(DISK);
    let start = Instant::now();
    match how {
        "msync" => assert_eq!(unsafe { msync(map.ptr, map.len, MS_SYNC) }, 0, "msync"),
        "fsync" => file.sync_all().expect("fsync"),
        _ => thread::sleep(Duration::from_secs(1)),
    }
    let sync_ms = ms(start);
    let disk1 = disk_stat(DISK);
    println!(
        "{how}: {mib} MiB file, MAP_SHARED, every page written through memory in {fill_ms:.1} ms, {minor} minor and {major} major page faults"
    );
    println!("  Dirty grew by {} kB, file dirty pages after the stores: {after_fill}", dirty1 as i64 - dirty0 as i64);
    println!(
        "  {}: {sync_ms:.1} ms, file dirty pages after it: {}, disk: {} KiB written, {} flushes",
        match how {
            "msync" => "msync(MS_SYNC)",
            "fsync" => "fsync(fd)",
            _ => "no sync, one second of sleep",
        },
        cachestat(&file).nr_dirty,
        (disk1.write_sectors - disk0.write_sectors) / 2,
        disk1.flushes - disk0.flushes
    );
    drop(map);
    fs::remove_file(path).expect("remove");
}

fn wait_for_kill(path: &str, mib: usize) {
    let file = create(path, mib);
    let map = Mapping::new(&file, mib << 20);
    map.fill();
    println!("{mib} MiB written through the mapping, no msync, no fsync, waiting to be killed");
    thread::sleep(Duration::from_secs(60));
    drop(map);
}

fn check(path: &str) {
    let data = fs::read(path).expect("read");
    let wrong = data.chunks(PAGE).enumerate().filter(|(i, page)| page[..8] != (*i as u64).to_le_bytes() || page[8..].iter().any(|&b| b != 0x6d)).count();
    println!("file size {} bytes, pages with wrong content: {wrong}", data.len());
}

fn sigbus(path: &str) {
    let file = create(path, 0);
    file.set_len(2 * PAGE as u64).expect("grow");
    let map = Mapping::new(&file, 2 * PAGE);
    unsafe { *map.ptr.add(PAGE) = 1 };
    println!("wrote to the second page of an 8 KiB mapping: ok");
    file.set_len(PAGE as u64).expect("shrink");
    println!("file truncated to 4096 bytes, writing to the second page again");
    unsafe { std::ptr::write_volatile(map.ptr.add(PAGE), 2) };
    println!("still alive after the write");
}

fn main() {
    let args: Vec<String> = env::args().collect();
    match args[1].as_str() {
        "sync" => sync_test(&args[2], args[3].parse().unwrap(), &args[4]),
        "kill" => wait_for_kill(&args[2], args[3].parse().unwrap()),
        "check" => check(&args[2]),
        "sigbus" => sigbus(&args[2]),
        _ => eprintln!("usage: mmapwrite sync PATH MIB msync|fsync|none | kill PATH MIB | check PATH | sigbus PATH"),
    }
}
