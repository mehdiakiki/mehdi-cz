use std::env;
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write};
use std::path::Path;
use std::thread;
use std::time::{Duration, Instant};

const PAGE: usize = 4096;
const BIG: usize = 1 << 30;

fn page(index: usize) -> Vec<u8> {
    let mut buf = vec![0x77u8; PAGE];
    buf[..8].copy_from_slice(&(index as u64).to_le_bytes());
    buf
}

fn write_big(path: &str) {
    let _ = fs::remove_file(path);
    let mut buf = Vec::with_capacity(BIG);
    for index in 0..BIG / PAGE {
        buf.extend_from_slice(&page(index));
    }
    let mut file = File::create(path).expect("create");
    println!("buffer of {BIG} bytes ready, calling write() once");
    let start = Instant::now();
    let written = file.write(&buf).expect("write");
    println!("write() returned {written} after {:.0} ms", start.elapsed().as_secs_f64() * 1000.0);
}

fn check_big(path: &str) {
    let mut data = Vec::new();
    File::open(path).expect("open").read_to_end(&mut data).expect("read");
    let ok = data.chunks(PAGE).enumerate().all(|(i, chunk)| chunk == &page(i)[..chunk.len()]);
    println!(
        "file size {} bytes = {} pages of 4 KiB + {} bytes, content is a prefix of the buffer: {}",
        data.len(),
        data.len() / PAGE,
        data.len() % PAGE,
        ok
    );
}

fn append(path: &str, writer: u8, size: usize, count: usize, pieces: usize, go: &str) {
    let mut file = OpenOptions::new().append(true).open(path).expect("open append");
    let record = vec![b'A' + writer; size];
    for _ in 0..5000 {
        if Path::new(go).exists() {
            break;
        }
        thread::sleep(Duration::from_millis(1));
    }
    for _ in 0..count {
        for piece in record.chunks(size / pieces) {
            let written = file.write(piece).expect("write");
            assert_eq!(written, piece.len(), "short write");
        }
    }
}

fn verify(path: &str, size: usize, writers: u8, count: usize) {
    let mut data = Vec::new();
    File::open(path).expect("open").read_to_end(&mut data).expect("read");
    let mut per_writer = vec![0usize; writers as usize];
    let mut mixed = 0;
    for slot in data.chunks(size) {
        let first = slot[0];
        if slot.len() == size && slot.iter().all(|&b| b == first) && (first - b'A') < writers {
            per_writer[(first - b'A') as usize] += 1;
        } else {
            mixed += 1;
        }
    }
    println!(
        "  records of {size:>8} bytes: file {} bytes, expected {}, records per writer {:?}, mixed records {}",
        data.len(),
        size * count * writers as usize,
        per_writer,
        mixed
    );
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let num = |i: usize| args[i].parse::<usize>().unwrap();
    match args[1].as_str() {
        "write" => write_big(&args[2]),
        "check" => check_big(&args[2]),
        "append" => append(&args[2], num(3) as u8, num(4), num(5), num(6), &args[7]),
        "verify" => verify(&args[2], num(3), num(4) as u8, num(5)),
        _ => eprintln!("usage: bigwrite write|check PATH | append PATH ID SIZE COUNT PIECES GO_PATH | verify PATH SIZE WRITERS COUNT"),
    }
}
