use std::time::{Instant, SystemTime};

#[path = "../harness.rs"]
mod harness;

const PAIRS: usize = 1_000_000;

fn main() {
    let bench = harness::Bench { warmup: 1_000_000, samples: 21, iters: 1_000_000 };
    harness::report("Instant::now", &bench.run((), |_| Instant::now()));
    harness::report("SystemTime::now", &bench.run((), |_| SystemTime::now()));

    let mut smallest = u128::MAX;
    let mut zeros = 0;
    for _ in 0..PAIRS {
        let a = Instant::now();
        let b = Instant::now();
        let step = (b - a).as_nanos();
        if step == 0 {
            zeros += 1;
        } else {
            smallest = smallest.min(step);
        }
    }
    println!("{PAIRS} pairs of Instant::now(): smallest nonzero difference {smallest} ns, {zeros} differences of zero");
}
