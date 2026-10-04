fn main() {
    let mut source = [Ok(1), Err("bad record"), Ok(3)].into_iter();
    let result: Result<Vec<_>, _> = source.by_ref().collect();

    assert_eq!(result, Err("bad record"));
    assert_eq!(
        source.next(),
        None,
        "collecting into Result stops at the first error"
    );
}
