enum State { Ready, Failed }

fn label(state: State) -> &'static str {
    match state {
        State::Ready => "ready",
    }
}

fn main() {}
