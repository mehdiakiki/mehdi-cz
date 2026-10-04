fn make_printer() -> impl Fn() {
    let message = String::from("ready");
    || println!("{message}")
}

fn main() {
    make_printer()();
}
