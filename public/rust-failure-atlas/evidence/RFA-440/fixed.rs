enum State { Ready, Failed }

fn label(state: State) -> &'static str {
    match state {
        State::Ready => "ready",
        State::Failed => "failed",
    }
}

fn main() {
    assert_eq!(label(State::Ready), "ready");
    assert_eq!(label(State::Failed), "failed");
}
