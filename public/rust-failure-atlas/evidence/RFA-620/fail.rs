async fn descend(depth: usize) {
    if depth > 0 {
        descend(depth - 1).await;
    }
}

fn main() {}
