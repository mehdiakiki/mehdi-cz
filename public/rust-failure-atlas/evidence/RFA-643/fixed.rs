struct Settings {
    retries: u8,
    timeout_ms: u64,
}

fn main() {
    let defaults = Settings { retries: 1, timeout_ms: 500 };
    let settings = Settings { retries: 3, ..defaults };
    assert_eq!(settings.timeout_ms, 500);
}
