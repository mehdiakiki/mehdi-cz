fn run_twice<F: Fn()>(action: F) {
    action();
    action();
}

fn main() {
    let payload = String::from("owned message");
    let consume = || drop(payload);

    run_twice(consume);
}
