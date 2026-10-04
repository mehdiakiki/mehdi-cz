enum State {
    Failed(String),
    Ready,
}

fn main() {
    let state = State::Failed(String::from("disk full"));
    match state {
        State::Failed => println!("failed"),
        State::Ready => println!("ready"),
    }
}
