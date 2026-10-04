use core::marker::PhantomData;

#[repr(transparent)]
struct RequestId(u64, PhantomData<marker::FutureMarker>);

fn main() {
    assert_eq!(core::mem::size_of::<RequestId>(), core::mem::size_of::<u64>());
}
