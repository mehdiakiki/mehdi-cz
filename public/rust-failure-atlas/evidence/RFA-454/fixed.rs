enum State {
    Failed(String),
    Ready,
}

fn main() {
    let state = State::Failed(String::from("disk full"));
    let message = match state {
        State::Failed(message) => message,
        State::Ready => String::from("ready"),
    };
    assert_eq!(message, "disk full");
}
