use std::any::Any;

fn main() {
    let pointer: *const dyn Any = &();
    let _send_pointer = pointer as *const (dyn Any + Send);
}
