use std::panic::catch_unwind;
use std::thread;

fn main() {
    let result = catch_unwind(|| {
        thread::scope(|scope| {
            scope.spawn(|| panic!("scoped worker failed"));
        });
    });

    assert!(
        result.is_ok(),
        "thread::scope propagates a panic from an automatically joined child"
    );
}
