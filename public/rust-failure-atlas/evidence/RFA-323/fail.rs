fn main() {
    let result = std::panic::catch_unwind(|| 7_u32.next_multiple_of(0));

    assert!(
        result.is_ok(),
        "u32::next_multiple_of panics when the divisor is zero"
    );
}
