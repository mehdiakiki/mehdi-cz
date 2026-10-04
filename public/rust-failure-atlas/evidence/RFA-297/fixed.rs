fn main() {
    let mut values = vec!["alpha", "beta", "gamma", "delta"];
    let removed = values.remove(1);

    assert_eq!(removed, "beta");
    assert_eq!(values, vec!["alpha", "gamma", "delta"]);
}
