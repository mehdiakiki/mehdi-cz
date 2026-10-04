use std::any::TypeId;

fn type_id<T>() -> TypeId {
    TypeId::of::<T>()
}

fn main() {
    let _ = type_id::<u32>();
}
