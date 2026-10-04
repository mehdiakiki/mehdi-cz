fn main() {
    let mut values = vec![String::from("first"), String::from("second")];
    let mut observed = Vec::new();

    values.dedup_by(|first, second| {
        observed.push((first.clone(), second.clone()));
        false
    });

    assert_eq!(
        observed,
        vec![(String::from("first"), String::from("second"))],
        "dedup_by passes each later element before its earlier neighbour"
    );
}
