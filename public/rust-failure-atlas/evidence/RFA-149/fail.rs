use std::marker::PhantomPinned;
use std::pin::Pin;

struct RequestState {
    attempts: u32,
    _pin: PhantomPinned,
}

fn main() {
    let mut state = Box::pin(RequestState {
        attempts: 0,
        _pin: PhantomPinned,
    });

    let state: &mut RequestState = Pin::as_mut(&mut state).get_mut();
    state.attempts += 1;
}
