async fn countdown(remaining: u32) {
    if remaining > 0 {
        countdown(remaining - 1).await;
    }
}

fn main() {}
