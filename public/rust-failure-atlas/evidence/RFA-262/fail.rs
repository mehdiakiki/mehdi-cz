fn main() {
    assert!("ab".parse::<char>().is_ok(), "parsing char requires exactly one Unicode scalar value");
}
