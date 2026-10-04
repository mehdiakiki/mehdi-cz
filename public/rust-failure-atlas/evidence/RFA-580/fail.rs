struct Metrics {
    requests: u64,
}

fn main() {
    let metrics = Metrics { requests: 12 };
    println!("{}", metrics.errors);
}
