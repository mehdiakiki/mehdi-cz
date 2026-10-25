use std::hint::black_box;
use std::time::Instant;

#[path = "../harness.rs"]
mod harness;

const KEYS: usize = 4096;
const RECORDS: usize = 4 << 20;

/// u32::MAX divided by x, a reciprocal in fixed point (u32::MAX for 0).
fn reciprocal(x: u16) -> u32 {
    if x == 0 { u32::MAX } else { u32::MAX / x as u32 }
}

struct Xorshift(u64);

impl Xorshift {
    fn next(&mut self) -> u64 {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 7;
        self.0 ^= self.0 << 17;
        self.0
    }

    fn key(&mut self) -> u16 {
        (self.next() >> 48) as u16
    }
}

/// The sum of f over the keys.
#[inline(never)]
fn sum<F: Fn(u16) -> u32>(keys: &[u16], f: F) -> u32 {
    keys.iter().fold(0u32, |acc, &k| acc.wrapping_add(f(k)))
}

/// Adds f(key) to the counter of the bucket of each record.
#[inline(never)]
fn count<F: Fn(u16) -> u32>(records: &[(u16, u32)], counters: &mut [u32], f: F) {
    for &(key, bucket) in records {
        let c = &mut counters[bucket as usize];
        *c = c.wrapping_add(f(key));
    }
}

/// Sum of the bytes, to read a buffer from start to end.
#[inline(never)]
fn read_all(buf: &[u8]) -> u64 {
    buf.iter().map(|&b| b as u64).sum()
}

fn median(v: &mut [f64]) -> f64 {
    v.sort_by(f64::total_cmp);
    harness::quantile(v, 0.5)
}

fn size(kib: usize) -> String {
    if kib < 1024 { format!("{kib} KiB") } else { format!("{} MiB", kib as f64 / 1024.0) }
}

fn main() {
    let table: Vec<u32> = (0..=u16::MAX).map(reciprocal).collect();
    let mut rng = Xorshift(0x9e3779b97f4a7c15);
    let mode = std::env::args().nth(1).unwrap_or_default();
    match mode.as_str() {
        "micro" => {
            let keys: Vec<u16> = (0..KEYS).map(|_| rng.key()).collect();
            assert_eq!(sum(&keys, reciprocal), sum(&keys, |k| table[k as usize]));
            let bench = harness::Bench { warmup: 20_000, samples: 21, iters: 100 };
            println!("microbenchmark: {KEYS} keys, ns per key (median of 21 samples)");
            for round in 1..=3 {
                let computed = median(&mut bench.run(&keys[..], |k| sum(k, reciprocal))) / KEYS as f64;
                let looked_up = median(&mut bench.run(&keys[..], |k| sum(k, |x| table[x as usize]))) / KEYS as f64;
                println!("round {round}: computed {computed:.3} ns, table {looked_up:.3} ns");
            }
        }
        "program" => {
            let keys: Vec<u16> = (0..RECORDS).map(|_| rng.key()).collect();
            let random: Vec<u64> = (0..RECORDS).map(|_| rng.next()).collect();
            println!("program: {RECORDS} records, ns per record (median and range of 5 passes)");
            println!("{:>9} {:>26} {:>26} {:>8}", "counters", "computed", "table", "ratio");
            for kib in [16, 128, 256, 512, 768, 1024, 1536, 2048, 4096, 8192, 16384, 65536] {
                let len = kib * 1024 / 4;
                let records: Vec<(u16, u32)> =
                    keys.iter().zip(&random).map(|(&k, &r)| (k, (r % len as u64) as u32)).collect();
                let mut a = vec![0u32; len];
                let mut b = vec![0u32; len];
                count(&records, &mut a, reciprocal);
                count(&records, &mut b, |k| table[k as usize]);
                assert!(a == b);
                let (mut computed, mut looked_up) = (Vec::new(), Vec::new());
                for _ in 0..5 {
                    let start = Instant::now();
                    count(black_box(&records), &mut a, reciprocal);
                    computed.push(start.elapsed().as_nanos() as f64 / RECORDS as f64);
                    let start = Instant::now();
                    count(black_box(&records), &mut b, |k| table[k as usize]);
                    looked_up.push(start.elapsed().as_nanos() as f64 / RECORDS as f64);
                }
                black_box((&a, &b));
                let range = |v: &[f64]| format!("({:.2} to {:.2})", v[0], v[v.len() - 1]);
                let (c, t) = (median(&mut computed), median(&mut looked_up));
                println!(
                    "{:>9} {:>8.2} ns {:>14} {:>8.2} ns {:>14} {:>8.2}",
                    size(kib),
                    c,
                    range(&computed),
                    t,
                    range(&looked_up),
                    t / c
                );
            }
        }
        "stream" => {
            let big: Vec<u8> = (0..256usize << 20).map(|i| (i * 13) as u8).collect();
            println!("burst of {KEYS} keys after reading a buffer, ns per key (median of 100 bursts)");
            for kib in [0, 1024, 4096, 16384, 65536] {
                let (mut computed, mut looked_up) = (Vec::new(), Vec::new());
                let mut offset = 0;
                // Blocks of 50 bursts of each version.
                for i in 0..200 {
                    let len = kib * 1024;
                    if offset + len > big.len() {
                        offset = 0;
                    }
                    black_box(read_all(black_box(&big[offset..offset + len])));
                    offset += len;
                    let keys: Vec<u16> = (0..KEYS).map(|_| rng.key()).collect();
                    let start = Instant::now();
                    if (i / 50) % 2 == 0 {
                        black_box(sum(black_box(&keys), reciprocal));
                        computed.push(start.elapsed().as_nanos() as f64 / KEYS as f64);
                    } else {
                        black_box(sum(black_box(&keys), |k| table[k as usize]));
                        looked_up.push(start.elapsed().as_nanos() as f64 / KEYS as f64);
                    }
                }
                println!(
                    "read {:>7} before each burst: computed {:.2} ns, table {:.2} ns",
                    size(kib),
                    median(&mut computed),
                    median(&mut looked_up)
                );
            }
        }
        other => panic!("unknown mode {}", other),
    }
}
