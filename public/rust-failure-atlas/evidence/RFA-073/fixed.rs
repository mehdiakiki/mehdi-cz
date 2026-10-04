use std::future::Future;
use std::pin::Pin;

fn countdown(remaining: u32) -> Pin<Box<dyn Future<Output = ()>>> {
    Box::pin(async move {
        if remaining > 0 {
            countdown(remaining - 1).await;
        }
    })
}

fn main() {
    let _future = countdown(3);
}
