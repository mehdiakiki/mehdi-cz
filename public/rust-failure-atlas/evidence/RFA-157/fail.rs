fn main() {
    let mut state = Some(String::from("pending"));

    let taken = state.take_if(|value| {
        value.push_str("-checked");
        false
    });

    assert!(taken.is_none());
    assert_eq!(
        state.as_deref(),
        Some("pending"),
        "take_if keeps predicate mutations even when it does not take the value"
    );
}
