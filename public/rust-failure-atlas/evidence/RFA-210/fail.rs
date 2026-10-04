fn main() {
    let outcomes = [Ok(1), Err("bad record"), Ok(3)];
    let values = outcomes.into_iter().flatten().collect::<Vec<_>>();

    assert_eq!(
        values.len(),
        3,
        "flattening an iterator of Result values silently drops errors"
    );
}
