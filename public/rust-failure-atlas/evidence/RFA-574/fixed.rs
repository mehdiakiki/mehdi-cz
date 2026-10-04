fn main() {
    let response = String::from("ready");
    let selected = response.as_str();

    assert_eq!(selected, "ready");
}
