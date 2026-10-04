struct Handle<T> {
    id: u64,
}

fn main() {
    let _ = Handle::<String> { id: 7 };
}
