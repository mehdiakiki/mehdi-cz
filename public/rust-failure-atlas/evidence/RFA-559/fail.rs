struct Limits {
    retries: u8,
}

fn main() {
    let _limits = Limits {
        retries: 3,
        timeout_ms: 500,
    };
}
