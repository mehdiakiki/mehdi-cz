use std::marker::PhantomPinned;
use std::pin::Pin;

struct Record {
    text: String,
    text_pointer: *const String,
    _pin: PhantomPinned,
}

fn main() {
    let mut record = Box::pin(Record {
        text: "atlas".to_owned(),
        text_pointer: std::ptr::null(),
        _pin: PhantomPinned,
    });

    // The pointee is pinned before the internal pointer is created.
    let pointer = std::ptr::addr_of!(record.text);
    unsafe {
        Pin::as_mut(&mut record).get_unchecked_mut().text_pointer = pointer;
    }

    let before_moving_handle = record.text_pointer as usize;
    let moved_handle = record;
    let after_moving_handle = std::ptr::addr_of!(moved_handle.text) as usize;

    // Moving the Box handle does not move its pinned heap pointee.
    assert_eq!(before_moving_handle, after_moving_handle);
}
