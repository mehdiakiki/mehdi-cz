fn main() {
    let parsed = "TRUE"
        .parse::<bool>()
        .expect("bool::from_str accepts only exact lowercase true and false");
    assert!(parsed);
}
