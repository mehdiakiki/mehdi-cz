use std::pin::Pin;

fn main() {
    let mut future = async { 42 };
    let _pinned = Pin::new(&mut future);
}
