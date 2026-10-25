#[allow(dead_code)]
mod record;

use record::{Format, encode, scan, scan_without_crc};
use std::collections::BTreeMap;
use std::env;
use std::fs::{self, File, OpenOptions};
use std::io::{self, BufRead, Write};
use std::path::{Path, PathBuf};
use std::time::Instant;

#[derive(Clone, Copy, PartialEq)]
enum Bug {
    None,
    AckBeforeFsync,
    SnapshotNotDurable,
    LoseTail,
    DoubleApply,
    NoDirFsync,
    NoCrcCheck,
}

type Map = BTreeMap<String, String>;

struct Store {
    dir: PathBuf,
    bug: Bug,
    map: Map,
    segment: u64,
    log: File,
    acks: u64,
    pending: Option<(u64, Map)>,
}

fn valid(op: &str) -> bool {
    let parts: Vec<&str> = op.splitn(3, ' ').collect();
    match parts[..] {
        ["put", key, _] | ["del", key] => !key.is_empty(),
        ["add", key, delta] => !key.is_empty() && delta.parse::<i64>().is_ok(),
        _ => false,
    }
}

fn apply(map: &mut Map, op: &str) {
    let parts: Vec<&str> = op.splitn(3, ' ').collect();
    match parts[0] {
        "put" => {
            map.insert(parts[1].to_string(), parts[2].to_string());
        }
        "del" => {
            map.remove(parts[1]);
        }
        "add" => {
            let current: i64 = map.get(parts[1]).and_then(|v| v.parse().ok()).unwrap_or(0);
            let delta: i64 = parts[2].parse().expect("add needs a number");
            map.insert(parts[1].to_string(), (current + delta).to_string());
        }
        _ => panic!("unknown operation: {op}"),
    }
}

fn segment_path(dir: &Path, number: u64) -> PathBuf {
    dir.join(format!("log.{number:06}"))
}

fn segments(dir: &Path) -> Vec<u64> {
    let mut numbers: Vec<u64> = fs::read_dir(dir)
        .expect("read dir")
        .filter_map(|e| e.ok()?.file_name().to_str()?.strip_prefix("log.")?.parse().ok())
        .collect();
    numbers.sort();
    numbers
}

fn load_snapshot(dir: &Path) -> (Map, u64) {
    let Ok(data) = fs::read(dir.join("snapshot")) else {
        return (Map::new(), 0);
    };
    let result = scan(Format::Full, &data);
    let records: Vec<String> = result.payloads.iter().map(|p| String::from_utf8_lossy(p).into_owned()).collect();
    let complete = records.first().is_some_and(|r| r.starts_with("snapshot ")) && records.last().is_some_and(|r| r == "end");
    if !complete {
        eprintln!("snapshot is damaged, ignored");
        return (Map::new(), 0);
    }
    let covered = records[0]["snapshot ".len()..].parse().expect("snapshot number");
    let mut map = Map::new();
    for op in &records[1..records.len() - 1] {
        apply(&mut map, op);
    }
    (map, covered)
}

impl Store {
    fn sync_dir(&self) {
        if self.bug != Bug::NoDirFsync {
            File::open(&self.dir).expect("open dir").sync_all().expect("fsync dir");
        }
    }

    fn start_segment(&mut self, number: u64) {
        let path = segment_path(&self.dir, number);
        self.log = OpenOptions::new().create(true).append(true).open(path).expect("create segment");
        self.sync_dir();
        self.segment = number;
    }

    fn mutate(&mut self, op: &str) {
        self.log.write_all(&encode(Format::Full, op.as_bytes())).expect("append to log");
        if self.bug != Bug::AckBeforeFsync {
            self.log.sync_data().expect("fdatasync log");
        }
        apply(&mut self.map, op);
        self.acks += 1;
        println!("ok {}", self.acks);
        if self.bug == Bug::AckBeforeFsync {
            self.log.sync_data().expect("fdatasync log");
        }
    }

    fn write_snapshot(&self, covered: u64, map: &Map) {
        let marker = if self.bug == Bug::DoubleApply { 0 } else { covered };
        let mut out = encode(Format::Full, format!("snapshot {marker}").as_bytes());
        for (key, value) in map {
            out.extend(encode(Format::Full, format!("put {key} {value}").as_bytes()));
        }
        out.extend(encode(Format::Full, b"end"));
        let tmp = self.dir.join("snapshot.tmp");
        let mut file = File::create(&tmp).expect("create snapshot.tmp");
        file.write_all(&out).expect("write snapshot");
        if self.bug != Bug::SnapshotNotDurable {
            file.sync_all().expect("fsync snapshot");
        }
        fs::rename(&tmp, self.dir.join("snapshot")).expect("rename snapshot");
        if self.bug != Bug::SnapshotNotDurable {
            self.sync_dir();
        }
    }

    fn begin_checkpoint(&mut self) {
        let covered = self.segment;
        if self.bug != Bug::LoseTail {
            self.start_segment(self.segment + 1);
        }
        self.pending = Some((covered, self.map.clone()));
    }

    fn end_checkpoint(&mut self) {
        let (covered, map) = self.pending.take().expect("no checkpoint in progress");
        if self.bug == Bug::LoseTail {
            self.write_snapshot(covered - 1, &map);
            self.log.set_len(0).expect("truncate log");
            self.log.sync_all().expect("fsync log");
            return;
        }
        self.write_snapshot(covered, &map);
        for number in segments(&self.dir).into_iter().filter(|&n| n <= covered) {
            fs::remove_file(segment_path(&self.dir, number)).expect("remove old segment");
        }
        self.sync_dir();
    }

    fn open(dir: &Path, bug: Bug) -> (Store, String) {
        let (mut map, covered) = load_snapshot(dir);
        let (mut replayed, mut cut) = (0, 0);
        let existing = segments(dir);
        for &number in existing.iter().filter(|&&n| n > covered) {
            let path = segment_path(dir, number);
            let data = fs::read(&path).expect("read segment");
            let result = if bug == Bug::NoCrcCheck { scan_without_crc(&data) } else { scan(Format::Full, &data) };
            for payload in &result.payloads {
                apply(&mut map, &String::from_utf8_lossy(payload));
                replayed += 1;
            }
            if result.valid_end < data.len() {
                cut += data.len() - result.valid_end;
                OpenOptions::new().write(true).open(&path).expect("open").set_len(result.valid_end as u64).expect("cut");
            }
        }
        let active = existing.iter().copied().filter(|&n| n > covered).max().unwrap_or(covered + 1);
        let created = !segment_path(dir, active).exists();
        let log = OpenOptions::new().create(true).append(true).open(segment_path(dir, active)).expect("open log");
        let mut store = Store { dir: dir.to_path_buf(), bug, map, segment: active, log, acks: 0, pending: None };
        let covered_files: Vec<u64> = existing.into_iter().filter(|&n| n <= covered).collect();
        for &number in &covered_files {
            fs::remove_file(segment_path(dir, number)).expect("remove covered segment");
        }
        if created || !covered_files.is_empty() {
            store.sync_dir();
        }
        if replayed > 0 {
            store.begin_checkpoint();
            store.end_checkpoint();
        }
        let info = format!("snapshot covers {covered}, replayed {replayed} records, cut {cut} bytes of torn tail");
        (store, info)
    }
}

fn parse_bug(args: &[String]) -> Bug {
    match args.iter().position(|a| a == "--bug").map(|i| args[i + 1].as_str()) {
        None => Bug::None,
        Some("ack-before-fsync") => Bug::AckBeforeFsync,
        Some("snapshot-not-durable") => Bug::SnapshotNotDurable,
        Some("lose-tail") => Bug::LoseTail,
        Some("double-apply") => Bug::DoubleApply,
        Some("no-dir-fsync") => Bug::NoDirFsync,
        Some("no-crc-check") => Bug::NoCrcCheck,
        Some(other) => panic!("unknown bug {other}"),
    }
}

fn serve(store: &mut Store) {
    for line in io::stdin().lock().lines() {
        let line = line.expect("read command");
        match line.trim() {
            "" => {}
            "begin-checkpoint" => store.begin_checkpoint(),
            "end-checkpoint" => store.end_checkpoint(),
            "checkpoint" => {
                store.begin_checkpoint();
                store.end_checkpoint();
            }
            op if valid(op) => store.mutate(op),
            other => println!("error: unknown command {other}"),
        }
    }
}

fn bench(store: &mut Store, count: usize, sync: bool) {
    let start = Instant::now();
    for i in 0..count {
        let op = format!("put key{i} value{i}");
        store.log.write_all(&encode(Format::Full, op.as_bytes())).expect("append");
        if sync {
            store.log.sync_data().expect("fdatasync");
        }
        apply(&mut store.map, &op);
    }
    let seconds = start.elapsed().as_secs_f64();
    println!(
        "{count} puts, {}: {:.0} puts per second, {:.0} us per put",
        if sync { "fdatasync after each put" } else { "no fsync" },
        count as f64 / seconds,
        seconds * 1e6 / count as f64
    );
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let dir = Path::new(&args[1]);
    let bug = parse_bug(&args);
    let (mut store, info) = Store::open(dir, bug);
    match args.get(2).map(String::as_str) {
        Some("dump") => {
            println!("{info}");
            for (key, value) in &store.map {
                println!("{key}={value}");
            }
        }
        Some("bench") => bench(&mut store, args[3].parse().unwrap(), args[4] == "fsync"),
        _ => serve(&mut store),
    }
}
