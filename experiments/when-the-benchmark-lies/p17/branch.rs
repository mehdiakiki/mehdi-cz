use std::hint::black_box;

#[path = "../harness.rs"]
mod harness;

const LEN: usize = 32 * 1024;

#[no_mangle]
#[inline(never)]
fn sum_filter(data: &[u8]) -> u64 {
    data.iter().filter(|&&x| x >= 128).map(|&x| x as u64).sum()
}

#[no_mangle]
#[inline(never)]
fn sum_if(data: &[u8]) -> u64 {
    let mut sum = 0u64;
    for &x in data {
        if x >= 128 {
            sum += x as u64;
        }
    }
    sum
}

/// Adds the bytes at or above 128, and passes every new sum through black_box.
#[no_mangle]
#[inline(never)]
fn sum_if_effect(data: &[u8]) -> u64 {
    let mut sum = 0u64;
    for &x in data {
        if x >= 128 {
            sum = black_box(sum + x as u64);
        }
    }
    sum
}

fn median(samples: &[f64]) -> f64 {
    let mut s = samples.to_vec();
    s.sort_by(f64::total_cmp);
    harness::quantile(&s, 0.5)
}

fn main() {
    let mut state = 0x9e3779b97f4a7c15_u64;
    let random: Vec<u8> = (0..LEN)
        .map(|_| {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            (state >> 24) as u8
        })
        .collect();
    let mut sorted = random.clone();
    sorted.sort_unstable();
    assert_eq!(sum_if(&random), sum_if(&sorted));
    assert_eq!(sum_filter(&random), sum_if_effect(&sorted));

    let bench = harness::Bench { warmup: 1000, samples: 21, iters: 500 };
    let fns: [(&str, fn(&[u8]) -> u64); 3] =
        [("sum_filter", sum_filter), ("sum_if", sum_if), ("sum_if_effect", sum_if_effect)];
    println!("{:<14} {:>12} {:>12} {:>9}", "function", "random", "sorted", "ratio");
    for (name, f) in fns {
        let r = median(&bench.run(&random[..], f)) / LEN as f64;
        let s = median(&bench.run(&sorted[..], f)) / LEN as f64;
        println!("{name:<14} {r:>9.3} ns {s:>9.3} ns {:>9.2}", r / s);
    }
}
