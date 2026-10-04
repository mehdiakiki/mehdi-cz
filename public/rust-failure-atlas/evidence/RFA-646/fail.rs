use std::ops::Deref;

struct Service;

impl Service {
    fn start<R: Deref<Target = Self>>(self: R) {}
}

fn main() {}
