use std::pin::Pin;

fn consume(_: Pin<&mut String>) {}

fn main() {
    let mut value = String::from("ready");
    let reference = &mut value;
    consume(Pin::new(reference));
}
