#[derive(Clone, Copy)]
enum State {
    Ready,
    Waiting,
}

trait Policy {
    const ACTIVE: State;
}

fn is_active<P: Policy>(state: State) -> bool {
    match state {
        P::ACTIVE => true,
        _ => false,
    }
}

fn main() {}
