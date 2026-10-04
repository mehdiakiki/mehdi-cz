fn main() {
    let fields: Vec<_> = "left:right".splitn(0, ':').collect();
    assert_eq!(
        fields,
        ["left:right"],
        "str::splitn with a limit of zero yields no substrings"
    );
}
