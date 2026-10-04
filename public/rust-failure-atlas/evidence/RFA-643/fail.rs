struct Settings {
    retries: u8,
    timeout_ms: u64,
}

fn main() {
    let _settings = Settings { retries: 3, .. };
}
