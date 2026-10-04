fn main() {
    let value = loop {
        break 7;
    };
    assert_eq!(value, 7);
}
