use std::mem::discriminant;

#[derive(Debug, PartialEq)]
enum State {
    Ready(u32),
    Failed(&'static str),
}

fn main() {
    let first = State::Ready(1);
    let second = State::Ready(99);
    let failed = State::Failed("network");

    assert_eq!(discriminant(&first), discriminant(&second));
    assert_ne!(discriminant(&first), discriminant(&failed));
    assert_ne!(first, second);
}
