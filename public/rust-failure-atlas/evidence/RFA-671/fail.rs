fn main() {
    let result: Result<u8, &str> = Err("offline");
    let result = result.inspect_err(|error| eprintln!("observed: {error}"));
    assert_eq!(result, Ok(0),
        "Result::inspect_err observes an error and returns the original Err unchanged");
}
