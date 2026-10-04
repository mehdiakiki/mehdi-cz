const LIMIT: u8 = 10;

fn classify(value: u8) -> &'static str {
    match value {
        LIMIT => "limit",
        _ => "other",
    }
}

fn main() {
    assert_eq!(classify(7), "other");
    assert_eq!(classify(10), "limit");
}
