fn main() {
    let records: Vec<_> = "a,b,".split_inclusive(',').collect();
    assert_eq!(records, ["a,", "b,"]);

    let fields: Vec<_> = "a,b,".split(',').collect();
    assert_eq!(fields, ["a", "b", ""]);
}
