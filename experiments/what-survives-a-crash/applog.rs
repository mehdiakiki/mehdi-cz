#[allow(dead_code)]
mod record;

use record::{Format, Tail, crc32, encode, scan};
use std::env;
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::Path;

fn payload(index: usize) -> Vec<u8> {
    let size = 16 + (index * 7919) % 6000;
    let mut data = vec![b'a' + (index % 26) as u8; size];
    let header = format!("record {index:06} ");
    data[..header.len()].copy_from_slice(header.as_bytes());
    data
}

fn append(path: &str, count: usize, sync: bool, dir_sync: bool) {
    let created = !Path::new(path).exists();
    let mut log = OpenOptions::new().create(true).append(true).open(path).expect("open log");
    if created && dir_sync {
        let parent = Path::new(path).parent().filter(|p| !p.as_os_str().is_empty());
        File::open(parent.unwrap_or(Path::new("."))).expect("open dir").sync_all().expect("fsync dir");
    }
    for index in 0..count {
        log.write_all(&encode(Format::Full, &payload(index))).expect("append");
        if sync {
            log.sync_data().expect("fdatasync");
            println!("ok {index}");
        }
    }
}

fn recover(path: &str) {
    let data = fs::read(path).unwrap_or_default();
    let result = scan(Format::Full, &data);
    let content_ok = result.payloads.iter().enumerate().all(|(i, p)| *p == payload(i));
    if Path::new(path).exists() {
        OpenOptions::new().write(true).open(path).expect("open").set_len(result.valid_end as u64).expect("truncate");
    }
    println!(
        "recovered {} records, tail {:?}, truncated from {} to {} bytes, content ok: {}",
        result.payloads.len(),
        result.tail,
        data.len(),
        result.valid_end,
        content_ok
    );
}

fn tail(path: &str) {
    let Ok(data) = fs::read(path) else {
        return println!("no log file");
    };
    let result = scan(Format::Full, &data);
    match result.tail {
        Tail::Clean => println!("clean end"),
        other => println!("torn last record ({other:?})"),
    }
}

fn fuzz(format: Format, name: &str) {
    let records: Vec<Vec<u8>> = (0..20).map(payload).map(|p| encode(format, &p)).collect();
    let log = records.concat();
    let ends: Vec<usize> = records.iter().scan(0, |end, r| {
        *end += r.len();
        Some(*end)
    }).collect();
    let mut seed = 12345u64;
    let mut random = vec![0u8; 64];
    for byte in random.iter_mut() {
        seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        *byte = (seed >> 33) as u8;
    }
    let tails: [(&str, Vec<u8>); 4] = [
        ("nothing", vec![]),
        ("8 zero bytes", vec![0; 8]),
        ("4096 zero bytes", vec![0; 4096]),
        ("64 random bytes", random),
    ];
    let first_cut = ends[16];
    println!(
        "fuzz, format {name}: 20 records, the file cut at every byte of the last 3 records ({} cuts), 4 kinds of tail",
        log.len() - first_cut + 1
    );
    for (label, garbage) in &tails {
        let (mut states, mut wrong, mut example) = (0, 0, None);
        for cut in first_cut..=log.len() {
            let damaged = [&log[..cut], &garbage[..]].concat();
            let expected = ends.iter().filter(|&&end| end <= cut).count();
            let result = scan(format, &damaged);
            let ok = result.payloads.len() == expected
                && result.payloads.iter().enumerate().all(|(i, p)| *p == payload(i))
                && result.valid_end == if expected == 0 { 0 } else { ends[expected - 1] };
            states += 1;
            if !ok {
                wrong += 1;
                example.get_or_insert((cut, expected, result.payloads.len(), result.tail));
            }
        }
        println!("  tail {label:<16} {states} states, wrong recoveries: {wrong}");
        if let Some((cut, expected, got, tail)) = example {
            println!("    first wrong: cut at byte {cut}, {expected} complete records, recovered {got}, stopped at {tail:?}");
        }
    }
}

fn main() {
    let args: Vec<String> = env::args().collect();
    match args[1].as_str() {
        "selftest" => {
            println!("crc32 of \"123456789\" = {:08x}", crc32(b"123456789"));
            println!("crc32 of nothing = {:08x}", crc32(b""));
            println!("crc32 of four zero bytes = {:08x}", crc32(&[0; 4]));
        }
        "append" => append(&args[2], args[3].parse().unwrap(), args[4] != "nosync", args[4] != "fsync-no-dir"),
        "recover" => recover(&args[2]),
        "tail" => tail(&args[2]),
        "fuzz" => {
            fuzz(Format::Full, "full (CRC over length and payload, length 0 rejected)");
            fuzz(Format::PayloadOnly, "payload-only (CRC over the payload only)");
        }
        _ => eprintln!("usage: applog selftest | append LOG N fsync|fsync-no-dir|nosync | recover LOG | tail LOG | fuzz"),
    }
}
