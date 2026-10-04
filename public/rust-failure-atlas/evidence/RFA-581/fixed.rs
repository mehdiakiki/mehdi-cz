struct Timeout {
    value_ms: u64,
}

fn main() {
    let timeout = Timeout { value_ms: 500 };
    assert_eq!(timeout.value_ms, 500);
}
