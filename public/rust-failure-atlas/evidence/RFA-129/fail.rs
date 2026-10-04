use std::sync::Arc;

struct NoClone;

#[derive(Clone)]
struct Shared<T> {
    value: Arc<T>,
}

fn main() {
    let original = Shared { value: Arc::new(NoClone) };
    let _copy = original.clone();
}
