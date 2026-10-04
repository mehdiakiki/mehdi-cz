use std::rc::Rc;

trait NestedReceiver {
    fn consume(self: Rc<Box<Self>>);
}

struct Local;

impl NestedReceiver for Local {
    fn consume(self: Rc<Box<Self>>) {}
}

fn main() {
    let _value: Box<dyn NestedReceiver> = Box::new(Local);
}
