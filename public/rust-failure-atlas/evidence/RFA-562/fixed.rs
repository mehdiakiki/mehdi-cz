#[derive(Debug, PartialEq)]
enum State {
    Ready,
    Waiting,
}

fn initial() -> State {
    State::Ready
}

fn main() {
    assert_eq!(initial(), State::Ready);
    let _ = State::Waiting;
}
