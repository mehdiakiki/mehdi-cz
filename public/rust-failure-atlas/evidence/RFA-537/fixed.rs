fn endpoint(production: bool) -> &'static str {
    let address = if production {
        "https://api.example.com"
    } else {
        "http://127.0.0.1:8080"
    };

    address
}

fn main() {
    assert_eq!(endpoint(false), "http://127.0.0.1:8080");
    assert_eq!(endpoint(true), "https://api.example.com");
}
