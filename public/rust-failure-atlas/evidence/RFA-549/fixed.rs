fn run_twice<F: Fn()>(action: F) {
    action();
    action();
}

fn main() {
    let payload = String::from("borrowed message");
    let inspect = || println!("{payload}");

    run_twice(inspect);
}
