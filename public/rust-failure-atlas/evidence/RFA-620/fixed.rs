async fn descend(depth: usize) {
    if depth > 0 {
        Box::pin(descend(depth - 1)).await;
    }
}

fn main() {
    let _future = descend(4);
}
