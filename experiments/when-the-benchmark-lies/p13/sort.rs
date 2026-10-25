use std::hint::black_box;
use std::time::Instant;

#[cfg(not(bigger))]
const LEN: usize = 1_000_000;
#[cfg(bigger)]
const LEN: usize = 1_040_000;

fn main() {
    let mut state = 0x9e3779b97f4a7c15_u64;
    let mut data: Vec<u32> = (0..LEN)
        .map(|_| {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            state as u32
        })
        .collect();
    let start = Instant::now();
    black_box(&mut data).sort_unstable();
    let ms = start.elapsed().as_secs_f64() * 1000.0;
    assert!(data.windows(2).all(|w| w[0] <= w[1]));
    println!("{ms:.3}");
}
