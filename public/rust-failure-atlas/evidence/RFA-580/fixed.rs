struct Metrics {
    requests: u64,
}

fn main() {
    let metrics = Metrics { requests: 12 };
    assert_eq!(metrics.requests, 12);
}
