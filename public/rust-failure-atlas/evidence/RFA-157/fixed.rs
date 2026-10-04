fn main() {
    let mut state = Some(String::from("pending"));

    let should_take = state.as_deref() == Some("ready");
    let taken = if should_take { state.take() } else { None };

    assert!(taken.is_none());
    assert_eq!(state.as_deref(), Some("pending"));
}
