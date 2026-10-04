fn make_printer() -> impl Fn() {
    let message = String::from("ready");
    move || println!("{message}")
}

fn main() {
    make_printer()();
}
