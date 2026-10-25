#[path = "../harness.rs"]
mod harness;

const LEN: usize = 4096;

#[no_mangle]
fn sum_iter(data: &[u64]) -> u64 {
    data.iter().sum()
}

#[no_mangle]
fn sum_index(data: &[u64]) -> u64 {
    let mut s = 0;
    for i in 0..data.len() {
        s += data[i];
    }
    s
}

#[no_mangle]
fn score(data: &[u64]) -> u64 {
    data.iter().map(|&x| x * 3).filter(|x| x % 2 == 0).sum()
}

fn main() {
    let data: Vec<u64> = (0..LEN as u64).collect();
    let bench = harness::Bench { warmup: 100, samples: 21, iters: 1000 };
    println!("checks: {} {} {}", sum_iter(&data), sum_index(&data), score(&data));
    harness::report("sum_iter", &bench.run(&data[..], sum_iter));
    harness::report("sum_index", &bench.run(&data[..], sum_index));
    harness::report("score", &bench.run(&data[..], score));
}
