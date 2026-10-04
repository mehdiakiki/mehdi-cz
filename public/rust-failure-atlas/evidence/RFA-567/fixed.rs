type Provider = fn() -> &'static str;

fn name() -> &'static str {
    "atlas"
}

fn main() {
    let provider: Provider = name;
    assert_eq!(provider(), "atlas");
}
