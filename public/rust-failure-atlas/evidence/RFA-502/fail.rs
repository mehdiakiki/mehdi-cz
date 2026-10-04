struct Limits {
    retries: u8,
    timeout_ms: u64,
}

fn main() {
    let _limits = Limits {
        retries: 2,
        timeout_ms: 500,
        retries: 4,
    };
}
