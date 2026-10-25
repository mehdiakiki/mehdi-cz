use std::env;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::thread;
use std::time::Duration;

const CHUNK: usize = 1 << 20;

fn chunk(index: u64) -> Vec<u8> {
    index.to_le_bytes().repeat(CHUNK / 8)
}

fn write(path: &str, count: u64) {
    let _ = fs::remove_file(path);
    let mut file = File::create(path).expect("create");
    for index in 0..count {
        file.write_all(&chunk(index)).expect("write");
    }
    println!("{count} MiB written, no fsync, now waiting to be killed");
    thread::sleep(Duration::from_secs(60));
    eprintln!("nobody killed me");
    std::process::exit(2);
}

fn check(path: &str, count: u64) {
    let mut file = File::open(path).expect("open");
    let size = file.metadata().expect("stat").len();
    let mut wrong = 0;
    let mut buf = vec![0u8; CHUNK];
    for index in 0..count {
        let ok = file.read_exact(&mut buf).is_ok() && buf == chunk(index);
        if !ok {
            wrong += 1;
        }
    }
    println!("file size: {size} bytes, wrong chunks: {wrong}");
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let count: u64 = args[3].parse().unwrap();
    match args[1].as_str() {
        "write" => write(&args[2], count),
        "check" => check(&args[2], count),
        _ => eprintln!("usage: chunks write|check PATH MIB"),
    }
}
