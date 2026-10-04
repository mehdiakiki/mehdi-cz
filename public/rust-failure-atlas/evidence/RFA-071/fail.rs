fn call_twice<F: Fn()>(callback: F) {
    callback();
    callback();
}

fn main() {
    let mut count = 0;
    call_twice(|| count += 1);
}
