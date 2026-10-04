use std::ptr::NonNull;

fn main() {
    let pointer = NonNull::<u64>::dangling();
    assert_eq!(pointer.as_ptr() as usize, 0, "NonNull::dangling returns a non-null aligned placeholder, not a null sentinel");
}
