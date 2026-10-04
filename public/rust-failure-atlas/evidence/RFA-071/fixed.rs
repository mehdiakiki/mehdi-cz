fn call_twice<F: FnMut()>(mut callback: F) {
    callback();
    callback();
}

fn main() {
    let mut count = 0;
    call_twice(|| count += 1);
    assert_eq!(count, 2);
}
