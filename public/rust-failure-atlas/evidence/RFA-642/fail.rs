fn identity<'a>(value: &'a str) -> &'a str {
    value
}

fn main() {
    let _function = identity::<'static>;
}
