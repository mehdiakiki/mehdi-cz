fn main() {
    let (remainder, overflowed) = i32::MIN.overflowing_rem(-1);
    assert_eq!(
        (remainder, overflowed),
        (0, false),
        "MIN remainder -1 has numeric result zero but overflowing_rem still reports the unrepresentable paired division"
    );
}
