extern crate core;

struct CoreMarker;

fn main() {
    let _marker = CoreMarker;
    assert_eq!(core::mem::size_of::<CoreMarker>(), 0);
}
