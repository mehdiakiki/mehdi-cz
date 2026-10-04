fn main() {
    let mut values = vec![String::from("first"), String::from("second")];
    let mut observed = Vec::new();

    values.dedup_by(|later, earlier| {
        observed.push((later.clone(), earlier.clone()));
        false
    });

    assert_eq!(
        observed,
        vec![(String::from("second"), String::from("first"))]
    );
    assert_eq!(values, ["first", "second"]);
}
