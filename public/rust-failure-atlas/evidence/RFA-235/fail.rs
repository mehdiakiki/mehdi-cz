use std::thread;

fn main() {
    let handle = thread::spawn(|| panic!("worker failed"));
    while !handle.is_finished() {
        thread::yield_now();
    }

    assert!(
        handle.join().is_ok(),
        "JoinHandle::is_finished reports completion, not successful completion"
    );
}
