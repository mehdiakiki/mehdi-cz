use std::any::TypeId;

fn type_id<T: 'static>() -> TypeId {
    TypeId::of::<T>()
}

fn main() {
    assert_eq!(TypeId::of::<u32>(), type_id::<u32>());
}
