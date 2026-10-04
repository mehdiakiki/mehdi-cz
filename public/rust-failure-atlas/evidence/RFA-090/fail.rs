use std::future::Future;

fn build_length() -> impl Future<Output = usize> {
    let text = String::from("atlas");
    async { text.len() }
}

fn main() {
    let _future = build_length();
}
