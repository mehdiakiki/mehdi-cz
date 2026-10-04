use std::sync::Mutex;

static COUNTER: Mutex<u32> = Mutex::new(0);

async fn bump_and_wait() {
    let guard = COUNTER.lock().unwrap();
    tokio::task::yield_now().await;
    println!("{}", *guard);
}

#[tokio::main]
async fn main() {
    tokio::spawn(bump_and_wait()).await.unwrap();
}
