unsafe extern "C" {
    fn malloc_trim(pad: usize) -> i32;
}

fn rss_kib() -> u64 {
    let statm = std::fs::read_to_string("/proc/self/statm").unwrap();
    let pages: u64 = statm.split_whitespace().nth(1).unwrap().parse().unwrap();
    pages * 4
}

fn report(step: &str) {
    println!("  {step:52} Rss {:7} KiB", rss_kib());
}

fn main() {
    println!("Rust, 1000000 boxes of 100 bytes, keep every 1000:");
    report("start");
    let mut blocks: Vec<Option<Box<[u8; 100]>>> = (0..1_000_000).map(|i| Some(Box::new([i as u8; 100]))).collect();
    report("after creating all boxes");
    for (i, block) in blocks.iter_mut().enumerate() {
        if i % 1000 != 0 {
            *block = None;
        }
    }
    report("after dropping all boxes except every 1000th");
    unsafe { malloc_trim(0) };
    report("after malloc_trim(0)");
    let kept = blocks.iter().flatten().map(|b| b[0] as u64).sum::<u64>();
    println!("  kept boxes still readable, sum of first bytes: {kept}");
}
