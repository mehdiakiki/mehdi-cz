use std::rc::Rc;

trait DirectReceiver {
    fn consume(self: Rc<Self>);
}

struct Local;

impl DirectReceiver for Local {
    fn consume(self: Rc<Self>) {}
}

fn main() {
    let value: Rc<dyn DirectReceiver> = Rc::new(Local);
    value.consume();
}
