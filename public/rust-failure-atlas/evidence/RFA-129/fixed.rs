use std::sync::Arc;

struct NoClone;

struct Shared<T> {
    value: Arc<T>,
}

impl<T> Clone for Shared<T> {
    fn clone(&self) -> Self {
        Self { value: self.value.clone() }
    }
}

fn main() {
    let original = Shared { value: Arc::new(NoClone) };
    let _copy = original.clone();
}
