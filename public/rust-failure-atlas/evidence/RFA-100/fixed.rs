const SCHEMA: &str = include_str!("schema.json");

fn main() {
    assert!(SCHEMA.contains("version"));
}
