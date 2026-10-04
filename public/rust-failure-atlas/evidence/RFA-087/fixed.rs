use std::sync::Mutex;

async fn read_after_yield(lock: &Mutex<u32>) -> u32 {
    let copied = {
        let guard = lock.lock().unwrap();
        *guard
    };
    std::future::ready(()).await;
    copied
}

fn require_send<T: Send>(_: T) {}

fn main() {
    let lock = Mutex::new(7);
    require_send(read_after_yield(&lock));
}
