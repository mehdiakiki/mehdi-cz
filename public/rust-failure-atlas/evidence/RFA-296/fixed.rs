use std::any::{Any, TypeId};

fn main() {
    let value: Box<dyn Any> = Box::new(7_u32);

    assert_eq!((&*value).type_id(), TypeId::of::<u32>());
    assert_eq!(value.downcast_ref::<u32>(), Some(&7));
}
