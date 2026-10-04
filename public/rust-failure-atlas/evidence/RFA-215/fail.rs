fn main() {
    let uppercase = 'ß'.to_uppercase().collect::<Vec<_>>();

    assert_eq!(
        uppercase.len(),
        1,
        "char::to_uppercase may expand one Unicode scalar into several"
    );
}
