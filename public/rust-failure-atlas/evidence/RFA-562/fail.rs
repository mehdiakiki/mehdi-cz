enum State {
    Ready,
    Waiting,
}

fn initial() -> State::Ready {
    State::Ready
}

fn main() {
    let _ = initial();
}
