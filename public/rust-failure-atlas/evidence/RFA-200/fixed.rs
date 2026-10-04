fn main() {
    let records = "alpha\nbeta\n".lines().collect::<Vec<_>>();
    assert_eq!(records, ["alpha", "beta"]);

    let fields = "alpha\nbeta\n".split('\n').collect::<Vec<_>>();
    assert_eq!(fields, ["alpha", "beta", ""]);
}
