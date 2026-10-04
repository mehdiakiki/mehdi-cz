fn main() {
    let parts: Vec<_> = "aé".split("").collect();
    assert_eq!(
        parts,
        ["a", "é"],
        "splitting with an empty pattern also yields boundary empty strings"
    );
}
