fn main() {
    let parts: Vec<_> = "a,b,".split_inclusive(',').collect();
    assert_eq!(parts, ["a,", "b,", ""], "split_inclusive attaches a trailing separator to the previous item and yields no empty tail");
}
