use std::thread;

fn main() {
    thread::scope(|scope| {
        let worker = scope.spawn(|| panic!("scoped worker failed"));
        assert!(worker.join().is_err());
    });
}
