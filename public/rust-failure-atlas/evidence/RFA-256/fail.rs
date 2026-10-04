use std::panic::{catch_unwind, AssertUnwindSafe};

fn main() {
    let mut buffer = [0_u8; 1];
    let outcome = catch_unwind(AssertUnwindSafe(|| {
        'é'.encode_utf8(&mut buffer);
    }));
    assert!(outcome.is_ok(), "char::encode_utf8 panics when the destination buffer is too small");
}
