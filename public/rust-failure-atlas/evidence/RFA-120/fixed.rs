fn replace<'stored>(slot: &mut &'stored str, incoming: &'stored str) {
    *slot = incoming;
}

fn main() {
    let long_lived = String::from("stable");
    let replacement = String::from("also stable");
    let mut slot = long_lived.as_str();
    replace(&mut slot, replacement.as_str());
    assert_eq!(slot, "also stable");
}
