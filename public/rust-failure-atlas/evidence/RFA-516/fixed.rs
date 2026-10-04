#[derive(Clone, Copy, PartialEq)]
enum State {
    Ready,
    Waiting,
}

trait Policy {
    const ACTIVE: State;
}

fn is_active<P: Policy>(state: State) -> bool {
    match state {
        candidate if candidate == P::ACTIVE => true,
        _ => false,
    }
}

struct ReadyPolicy;

impl Policy for ReadyPolicy {
    const ACTIVE: State = State::Ready;
}

fn main() {
    assert!(is_active::<ReadyPolicy>(State::Ready));
    assert!(!is_active::<ReadyPolicy>(State::Waiting));
}
