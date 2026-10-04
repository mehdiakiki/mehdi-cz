fn classify(code: u8) -> &'static str {
    match code {
        0..0 => "impossible",
        _ => "other",
    }
}

fn main() {
    println!("{}", classify(0));
}
