fn parse_port() -> u16 {
    std::env::args()
        .nth(1)
        .and_then(|value| value.parse().ok())
        .unwrap_or(8080)
}

fn main() {
    let port = parse_port();
    println!("listening on {port}");
}
