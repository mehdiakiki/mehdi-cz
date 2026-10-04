#[unsafe(no_mangle)]
pub extern "C" fn rfa_runtime_status() -> i32 {
    0
}

fn main() {
    assert_eq!(rfa_runtime_status(), 0);
}
