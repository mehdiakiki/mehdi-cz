fn main() {
    let lines = "alpha\nbeta\n".lines().collect::<Vec<_>>();

    assert_eq!(
        lines,
        ["alpha", "beta", ""],
        "str::lines omits the trailing empty line"
    );
}
