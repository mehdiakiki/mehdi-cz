fn main() {
    let [value] = &[String::from("ready")];
    assert_eq!(value, "ready");
}
