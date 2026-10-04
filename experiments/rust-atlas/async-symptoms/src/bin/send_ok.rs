use std::sync::Mutex;

static COUNTER: Mutex<u32> = Mutex::new(0);

async fn bump_and_wait() {
    let value = {
        let mut guard = COUNTER.lock().unwrap();
        *guard += 1;
        *guard
    };
    tokio::task::yield_now().await;
    println!("{value}");
}

#[tokio::main]
async fn main() {
    tokio::spawn(bump_and_wait()).await.unwrap();
}
