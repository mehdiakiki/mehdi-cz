use std::panic;

fn main() {
    assert_eq!(10_i32.overflowing_div(2), (5, false));
    assert_eq!(i32::MIN.overflowing_div(-1), (i32::MIN, true));
    assert_eq!(i32::MIN.checked_div(-1), None);

    let zero_divisor = panic::catch_unwind(|| 10_i32.overflowing_div(0));
    assert!(zero_divisor.is_err());
}
