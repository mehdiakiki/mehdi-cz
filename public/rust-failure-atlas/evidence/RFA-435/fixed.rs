fn outer<T>(value: T) {
    fn inner<U>(item: U) {
        drop(item);
    }
    inner(value);
}

fn main() {
    outer(String::from("atlas"));
}
