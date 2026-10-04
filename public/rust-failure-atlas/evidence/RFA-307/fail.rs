fn main() {
    let mut text = String::from("aéb");
    let byte_length = text.len();
    let mut predicate_calls = 0;

    text.retain(|_| {
        predicate_calls += 1;
        true
    });

    assert_eq!(
        predicate_calls,
        byte_length,
        "String::retain calls its predicate once per Unicode scalar value, not once per UTF-8 byte"
    );
}
