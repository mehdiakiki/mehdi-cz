fn call_once<F: FnOnce()>(callback: F) {
    callback();
}

fn main() {
    let value = String::from("atlas");
    call_once(|| drop(value));
}
