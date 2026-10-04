use std::panic::catch_unwind;

fn main() {
    let mut completed = 0;
    let _ = catch_unwind(|| {
        completed += 1;
        panic!("operation failed");
    });
}
