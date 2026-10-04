fn main() {
    let mut endpoint = Some("configured");
    let selected = endpoint.insert("fallback");

    assert_eq!(
        *selected, "configured",
        "Option::insert replaces an existing value"
    );
}
