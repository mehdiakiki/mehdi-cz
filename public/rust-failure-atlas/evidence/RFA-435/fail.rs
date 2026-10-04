fn outer<T>(value: T) {
    fn inner(item: T) {
        drop(item);
    }
    inner(value);
}

fn main() {}
