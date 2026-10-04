use std::panic::catch_unwind;

fn main() {
    let outcome = catch_unwind(|| [1_u8, 2, 3].chunks(0).count());
    assert!(outcome.is_ok(), "slice::chunks panics when chunk_size is zero");
}
