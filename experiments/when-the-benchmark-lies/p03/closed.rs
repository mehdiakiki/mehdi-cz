use std::hint::black_box;

#[path = "../harness.rs"]
mod harness;

fn sum_below(n: u64) -> u64 {
    let mut s = 0;
    for i in 0..n {
        s += i;
    }
    s
}

#[no_mangle]
#[inline(never)]
fn sum_below_1000() -> u64 {
    sum_below(1000)
}

#[no_mangle]
#[inline(never)]
fn sum_below_n(n: u64) -> u64 {
    sum_below(n)
}

#[no_mangle]
#[inline(never)]
fn sum_array(data: &[u64]) -> u64 {
    let mut s = 0;
    for &x in data {
        s += x;
    }
    s
}

fn main() {
    let bench = harness::Bench { warmup: 1000, samples: 21, iters: 100_000 };
    println!("sum_below_1000() = {}", black_box(sum_below_1000()));
    for n in [1_000u64, 1_000_000, 1_000_000_000] {
        println!("sum_below_n({n}) = {}", sum_below_n(n));
        harness::report(&format!("below_n_{n}"), &bench.run(n, sum_below_n));
    }

    let data: Vec<u64> = (0..10_000_000).collect();
    for n in [1_000usize, 10_000, 100_000, 1_000_000, 10_000_000] {
        let iters = (100_000_000 / n) as u64;
        let bench = harness::Bench { warmup: iters, samples: 21, iters };
        let samples = bench.run(&data[..n], sum_array);
        harness::report(&format!("array_{n}"), &samples);
        let mut sorted = samples.clone();
        sorted.sort_by(f64::total_cmp);
        println!("{:<18} median per element {:.3} ns", "", harness::quantile(&sorted, 0.5) / n as f64);
    }
}
