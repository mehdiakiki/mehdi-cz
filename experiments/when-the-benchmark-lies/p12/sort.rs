use std::hint::black_box;
use std::time::Instant;

extern "C" {
    fn sched_getcpu() -> i32;
}

const LEN: usize = 1_000_000;

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
    let cpu = unsafe { sched_getcpu() };
    let path = format!("/sys/devices/system/cpu/cpu{cpu}/cpufreq/scaling_cur_freq");
    let khz: u64 = std::fs::read_to_string(path).expect("read scaling_cur_freq").trim().parse().expect("number");
    assert!(data.windows(2).all(|w| w[0] <= w[1]));
    println!("{ms:.3} {}", khz / 1000);
}
