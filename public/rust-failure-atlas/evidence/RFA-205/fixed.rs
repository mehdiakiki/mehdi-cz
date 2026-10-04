fn main() {
    let mut endpoint = Some("configured");
    let mut fallback_calls = 0;

    let selected = endpoint.get_or_insert_with(|| {
        fallback_calls += 1;
        "fallback"
    });

    assert_eq!(*selected, "configured");
    assert_eq!(fallback_calls, 0);
}
