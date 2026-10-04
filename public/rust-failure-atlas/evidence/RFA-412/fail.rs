use std::mem::{needs_drop, ManuallyDrop};

struct Tracked;
impl Drop for Tracked { fn drop(&mut self) {} }

fn main() {
    assert!(needs_drop::<ManuallyDrop<Tracked>>(), "ManuallyDrop suppresses automatic drop glue even when its inner value implements Drop");
}
