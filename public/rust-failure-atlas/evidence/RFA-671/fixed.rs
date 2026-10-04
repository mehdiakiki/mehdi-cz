fn main() {
    let result: Result<u8, &str> = Err("offline");
    let value = result
        .inspect_err(|error| eprintln!("observed: {error}"))
        .unwrap_or(0);
    assert_eq!(value, 0);
}
