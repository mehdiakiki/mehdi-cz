use std::panic;
use std::thread;

fn main() {
    let outcome = panic::catch_unwind(|| {
        thread::Builder::new()
            .name("worker\0hidden".to_owned())
            .spawn(|| ())
    });

    assert!(
        outcome.is_ok(),
        "Builder::spawn panics before returning io::Result when the configured name contains NUL"
    );
}
