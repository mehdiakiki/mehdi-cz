fn call<F: FnMut()>(mut callback: F) {
    callback();
}

fn main() {
    let value = String::from("atlas");
    call(|| drop(value));
}
