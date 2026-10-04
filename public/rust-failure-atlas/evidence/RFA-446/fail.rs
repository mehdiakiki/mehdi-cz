fn classify(value: u8) -> &'static str {
    match value {
        10..=5 => "impossible",
        _ => "other",
    }
}

fn main() {}
