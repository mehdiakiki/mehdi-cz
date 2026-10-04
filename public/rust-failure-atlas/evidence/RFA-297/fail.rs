fn main() {
    let mut values = vec!["alpha", "beta", "gamma", "delta"];
    let removed = values.swap_remove(1);

    assert_eq!(removed, "beta");
    assert_eq!(
        values,
        vec!["alpha", "gamma", "delta"],
        "Vec::swap_remove replaces the removed slot with the last element and does not preserve order"
    );
}
