fn identity(value: &String) -> &str {
    value.as_str()
}

fn main() {
    let owner = String::from("ready");
    let selected = identity(&owner);
    assert_eq!(selected, "ready");
}
