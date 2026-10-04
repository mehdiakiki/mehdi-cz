use std::any::{Any, TypeId};

fn main() {
    let value: Box<dyn Any> = Box::new(7_u32);

    assert_eq!(
        value.type_id(),
        TypeId::of::<u32>(),
        "Any::type_id called on Box<dyn Any> reports the box type instead of the contained dynamic value"
    );
}
