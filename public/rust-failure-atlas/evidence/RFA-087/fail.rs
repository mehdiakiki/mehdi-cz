use std::sync::Mutex;

async fn read_after_yield(lock: &Mutex<u32>) -> u32 {
    let guard = lock.lock().unwrap();
    std::future::ready(()).await;
    *guard
}

fn require_send<T: Send>(_: T) {}

fn main() {
    let lock = Mutex::new(7);
    require_send(read_after_yield(&lock));
}
