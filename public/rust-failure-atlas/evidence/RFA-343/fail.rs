fn main() {
    assert!(
        i32::MIN.wrapping_abs() >= 0,
        "wrapping_abs leaves i32::MIN negative because its positive magnitude is not representable as i32"
    );
}
