unsafe extern "C" {
    fn rfa_missing_symbol() -> i32;
}

fn main() {
    // SAFETY: the declaration claims the function is supplied by a native library.
    let status = unsafe { rfa_missing_symbol() };
    println!("{status}");
}
