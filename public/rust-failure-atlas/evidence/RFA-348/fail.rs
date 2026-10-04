use std::mem::discriminant;

enum State {
    Ready(u32),
    Failed(&'static str),
}

fn main() {
    let first = State::Ready(1);
    let second = State::Ready(99);
    let _unused = State::Failed("network");

    assert_ne!(
        discriminant(&first),
        discriminant(&second),
        "mem::discriminant identifies the variant and deliberately ignores its payload"
    );
}
