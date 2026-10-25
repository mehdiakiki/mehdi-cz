// Prints what the running CPU reports, then computes a wrapping dot product
// of two u64 slices in a function the compiler may vectorize.
use std::hint::black_box;

#[inline(never)]
#[unsafe(no_mangle)]
pub fn dot_u64(a: &[u64], b: &[u64]) -> u64 {
    a.iter()
        .zip(b)
        .map(|(x, y)| x.wrapping_mul(*y))
        .fold(0, u64::wrapping_add)
}

fn main() {
    println!(
        "is_x86_feature_detected!(\"avx2\") = {}",
        std::arch::is_x86_feature_detected!("avx2")
    );
    println!(
        "is_x86_feature_detected!(\"avx512f\") = {}",
        std::arch::is_x86_feature_detected!("avx512f")
    );
    let a: Vec<u64> = (1..=1024).collect();
    let b: Vec<u64> = (1..=1024).rev().collect();
    println!("dot = {}", dot_u64(black_box(&a), black_box(&b)));
}
