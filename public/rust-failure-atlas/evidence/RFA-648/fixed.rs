use std::any::Any;

fn main() {
    let pointer: *const (dyn Any + Send) = &();
    assert!(!pointer.is_null());
}
