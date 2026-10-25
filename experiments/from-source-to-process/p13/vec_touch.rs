use std::time::Instant;

const SIZE: usize = 1 << 30;
const PAGE: usize = 4096;

fn minor_faults() -> u64 {
    let stat = std::fs::read_to_string("/proc/self/stat").unwrap();
    let after_name = &stat[stat.rfind(')').unwrap() + 2..];
    after_name.split_whitespace().nth(7).unwrap().parse().unwrap()
}

fn report(label: &str, start: Instant, faults_before: u64) {
    let ms = start.elapsed().as_secs_f64() * 1e3;
    println!("  {label:28} {ms:8.1} ms {:8} minor faults", minor_faults() - faults_before);
}

fn main() {
    let mode = std::env::args().nth(1).unwrap_or_default();
    println!("{mode}:");
    let (f0, t0) = (minor_faults(), Instant::now());
    let mut v: Vec<u8> = match mode.as_str() {
        "vec-macro" => vec![0u8; SIZE],
        "resize-zero" => {
            let mut v = Vec::with_capacity(SIZE);
            v.resize(SIZE, 0);
            v
        }
        _ => {
            let mut v = Vec::with_capacity(SIZE);
            v.resize(SIZE, 1);
            v
        }
    };
    report("create the vector", t0, f0);
    let (f0, t0) = (minor_faults(), Instant::now());
    for i in (0..SIZE).step_by(PAGE) {
        v[i] = 1;
    }
    report("write one byte per page", t0, f0);
    println!("  {:28} {}", "sum of one byte per page", v.iter().step_by(PAGE).map(|&b| b as u64).sum::<u64>());
}
