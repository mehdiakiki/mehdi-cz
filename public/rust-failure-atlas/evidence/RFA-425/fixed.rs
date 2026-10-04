struct Content<'a> {
    body: &'a str,
}

async fn publish(content: Content<'_>) -> usize {
    content.body.len()
}

fn main() {
    let future = publish(Content { body: "atlas" });
    drop(future);
}
