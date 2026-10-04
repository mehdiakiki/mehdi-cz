struct Content<'a> {
    body: &'a str,
}

async fn publish(content: Content) -> usize {
    content.body.len()
}

fn main() {}
