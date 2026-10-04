fn classify(code: u8) -> &'static str {
    match code {
        0..1 => "zero",
        _ => "other",
    }
}

fn main() {
    assert_eq!(classify(0), "zero");
    assert_eq!(classify(1), "other");
}
