struct View<'a> {
    text: &'a str,
}

fn main() {
    let owned = String::from("ready");
    let view = View { text: &owned };
    assert_eq!(view.text, "ready");
}
