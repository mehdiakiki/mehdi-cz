struct Config {
    enabled: bool,
}

fn main() {
    let config = Config { enabled: true };
    assert!(config.enabled);
}
