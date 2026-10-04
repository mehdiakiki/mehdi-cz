use std::thread;
use std::time::Duration;

fn main() {
    let current = thread::current();
    current.unpark();
    current.unpark();
    thread::park();

    let waker = current.clone();
    let handle = thread::spawn(move || {
        thread::sleep(Duration::from_millis(10));
        waker.unpark();
    });
    thread::park();
    handle.join().unwrap();
}
