use std::rc::Rc;

struct Service;

impl Service {
    fn start(self: Rc<Self>) {}
}

fn main() {
    Rc::new(Service).start();
}
