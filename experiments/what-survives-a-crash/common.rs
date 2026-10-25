use std::fs::{self, File};
use std::os::fd::AsRawFd;

pub fn meminfo_kb(field: &str) -> u64 {
    let text = fs::read_to_string("/proc/meminfo").expect("read /proc/meminfo");
    for line in text.lines() {
        let mut parts = line.split_whitespace();
        if parts.next() == Some(&format!("{field}:")[..]) {
            return parts.next().unwrap().parse().unwrap();
        }
    }
    panic!("{} not found in /proc/meminfo", field);
}

pub fn self_io(field: &str) -> u64 {
    let text = fs::read_to_string("/proc/self/io").expect("read /proc/self/io");
    for line in text.lines() {
        if let Some(value) = line.strip_prefix(&format!("{field}: ")[..]) {
            return value.trim().parse().unwrap();
        }
    }
    panic!("{} not found in /proc/self/io", field);
}

pub fn vmstat(field: &str) -> u64 {
    let text = fs::read_to_string("/proc/vmstat").expect("read /proc/vmstat");
    for line in text.lines() {
        let mut parts = line.split_whitespace();
        if parts.next() == Some(field) {
            return parts.next().unwrap().parse().unwrap();
        }
    }
    panic!("{} not found in /proc/vmstat", field);
}

fn stat_field(index: usize) -> u64 {
    let text = fs::read_to_string("/proc/self/stat").expect("read /proc/self/stat");
    let after_name = &text[text.rfind(')').expect("comm") + 2..];
    after_name.split_whitespace().nth(index).unwrap().parse().unwrap()
}

pub fn minor_faults() -> u64 {
    stat_field(7)
}

pub fn major_faults() -> u64 {
    stat_field(9)
}

pub struct DiskStat {
    pub write_sectors: u64,
    pub flushes: u64,
}

pub fn disk_stat(disk: &str) -> DiskStat {
    let text = fs::read_to_string(format!("/sys/block/{disk}/stat")).expect("read disk stat");
    let v: Vec<u64> = text.split_whitespace().map(|s| s.parse().unwrap()).collect();
    DiskStat { write_sectors: v[6], flushes: v[15] }
}

#[repr(C)]
struct CacheRange {
    off: u64,
    len: u64,
}

#[repr(C)]
#[derive(Default, Clone, Copy)]
pub struct CacheStat {
    pub nr_cache: u64,
    pub nr_dirty: u64,
    pub nr_writeback: u64,
    pub nr_evicted: u64,
    pub nr_recently_evicted: u64,
}

unsafe extern "C" {
    fn syscall(number: i64, ...) -> i64;
}

const SYS_CACHESTAT: i64 = 451;

pub fn cachestat(file: &File) -> CacheStat {
    let range = CacheRange { off: 0, len: 0 };
    let mut stat = CacheStat::default();
    let rc = unsafe {
        syscall(
            SYS_CACHESTAT,
            file.as_raw_fd() as i64,
            &range as *const CacheRange,
            &mut stat as *mut CacheStat,
            0i64,
        )
    };
    assert_eq!(rc, 0, "cachestat failed: {}", std::io::Error::last_os_error());
    stat
}

pub fn percentile(sorted: &[f64], p: f64) -> f64 {
    let rank = (p / 100.0 * sorted.len() as f64).ceil() as usize;
    sorted[rank.clamp(1, sorted.len()) - 1]
}
