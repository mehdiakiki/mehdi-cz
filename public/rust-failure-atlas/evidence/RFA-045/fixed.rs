use std::panic::catch_unwind;

pub extern "C" fn callback() -> i32 {
    match catch_unwind(|| {
        panic!("panic contained inside the Rust frame");
    }) {
        Ok(()) => 0,
        Err(_) => 2,
    }
}

fn main() {
    assert_eq!(callback(), 2);
}
