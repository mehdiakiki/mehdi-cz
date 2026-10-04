#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2")]
fn process_with_avx2(value: i32) -> i32 {
    value + 1
}

fn main() {
    #[cfg(target_arch = "x86_64")]
    if std::arch::is_x86_feature_detected!("avx2") {
        // SAFETY: runtime feature detection proves AVX2 is available for this call.
        assert_eq!(unsafe { process_with_avx2(41) }, 42);
    }
}
