fn main() {
    let query = r##"status = "ready""##;
    assert!(query.contains("ready"));
}
