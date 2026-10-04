struct Limits {
    retries: u8,
    timeout_ms: u64,
}

fn main() {
    let limits = Limits {
        retries: 3,
        timeout_ms: 500,
    };
    assert_eq!((limits.retries, limits.timeout_ms), (3, 500));
}
