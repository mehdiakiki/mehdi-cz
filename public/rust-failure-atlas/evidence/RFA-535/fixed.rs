#[derive(Debug, Eq, Ord, PartialEq, PartialOrd)]
struct Version {
    major: u16,
    minor: u16,
}

fn main() {
    let deployed = Version { major: 2, minor: 4 };
    let required = Version { major: 2, minor: 1 };
    assert!(deployed > required);
}
