#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2")]
fn process_with_avx2(value: i32) -> i32 {
    value + 1
}

fn main() {
    #[cfg(target_arch = "x86_64")]
    println!("{}", process_with_avx2(41));
}
