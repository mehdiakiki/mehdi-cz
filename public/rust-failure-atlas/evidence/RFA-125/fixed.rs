#[unsafe(no_mangle)]
pub extern "C" fn rfa_supplied_symbol() -> i32 {
    42
}

fn main() {
    assert_eq!(rfa_supplied_symbol(), 42);
}
