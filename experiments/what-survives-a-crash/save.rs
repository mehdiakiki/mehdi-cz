use std::env;
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;
use std::thread;
use std::time::Duration;

const PIECES: usize = 64;
const PIECE: usize = 4096;

fn piece(version: u8, index: usize) -> Vec<u8> {
    let mut buf = vec![b'a' + version; PIECE];
    let header = format!("v{version} piece {index:02}\n");
    buf[..header.len()].copy_from_slice(header.as_bytes());
    buf
}

fn write_pieces(file: &mut File, version: u8, pause: Duration) {
    for index in 0..PIECES {
        file.write_all(&piece(version, index)).expect("write");
        thread::sleep(pause);
    }
}

fn naive(path: &str, version: u8, pause: Duration) {
    let mut file = File::create(path).expect("open with O_TRUNC");
    write_pieces(&mut file, version, pause);
}

fn replace(path: &str, version: u8, pause: Duration, sync: bool) {
    let tmp = format!("{path}.tmp");
    let mut file = File::create(&tmp).expect("create temp");
    write_pieces(&mut file, version, pause);
    if sync {
        file.sync_all().expect("fsync temp");
    }
    fs::rename(&tmp, path).expect("rename");
}

fn sync_parent(path: &str) {
    let parent = Path::new(path).parent().filter(|p| !p.as_os_str().is_empty());
    let dir = File::open(parent.unwrap_or(Path::new("."))).expect("open dir");
    dir.sync_all().expect("fsync dir");
}

fn check(path: &str) {
    let data = match fs::read(path) {
        Ok(data) => data,
        Err(_) => return println!("file missing"),
    };
    if data.is_empty() {
        return println!("empty file");
    }
    let mut versions = Vec::new();
    for (index, chunk) in data.chunks(PIECE).enumerate() {
        let version = (1..=2).find(|&v| chunk == &piece(v, index)[..chunk.len()]);
        versions.push(version);
    }
    let complete = data.len() == PIECES * PIECE;
    let label = match (versions.iter().all(|v| *v == Some(1)), versions.iter().all(|v| *v == Some(2))) {
        (true, _) if complete => "old version, complete",
        (_, true) if complete => "new version, complete",
        (_, true) => "new version, cut short",
        (true, _) => "old version, cut short",
        _ => "mix or damaged",
    };
    println!("{label}");
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let pause = |i: usize| Duration::from_micros(args[i].parse().unwrap());
    match args[1].as_str() {
        "naive" => naive(&args[2], args[3].parse().unwrap(), pause(4)),
        "safe" => replace(&args[2], args[3].parse().unwrap(), pause(4), true),
        "rename" => replace(&args[2], args[3].parse().unwrap(), pause(4), false),
        "durable" => {
            replace(&args[2], args[3].parse().unwrap(), pause(4), true);
            sync_parent(&args[2]);
        }
        "check" => return check(&args[2]),
        _ => return eprintln!("usage: save naive|safe|rename|durable PATH VERSION PAUSE_US | save check PATH"),
    }
    println!("saved");
}
