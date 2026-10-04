fn classify(value: u8) -> &'static str {
    match value {
        5..=10 => "small",
        _ => "other",
    }
}

fn main() {
    assert_eq!(classify(7), "small");
}
