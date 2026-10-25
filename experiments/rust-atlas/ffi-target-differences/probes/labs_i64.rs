// Declares the C function `long labs(long)` with i64 in place of c_long and
// prints what the call returns.
use std::hint::black_box;

unsafe extern "C" {
    fn labs(x: i64) -> i64;
}

fn main() {
    let x: i64 = black_box(-5_000_000_000);
    let y = unsafe { labs(x) };
    println!(
        "{}: c_long is {} bytes, labs({x}) declared with i64 returned {y}",
        std::env::consts::ARCH,
        size_of::<std::ffi::c_long>()
    );
}
