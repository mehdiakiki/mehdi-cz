#[no_mangle]
pub fn sum_below_n(n: u64) -> u64 {
    let mut s = 0;
    for i in 0..n {
        s += i;
    }
    s
}
