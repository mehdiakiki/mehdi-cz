use std::cell::Cell;
use std::marker::PhantomPinned;
use std::pin::Pin;

struct RequestState {
    attempts: Cell<u32>,
    _pin: PhantomPinned,
}

impl RequestState {
    fn record_attempt(self: Pin<&Self>) {
        self.attempts.set(self.attempts.get() + 1);
    }
}

fn main() {
    let state = Box::pin(RequestState {
        attempts: Cell::new(0),
        _pin: PhantomPinned,
    });

    state.as_ref().record_attempt();
    assert_eq!(state.as_ref().attempts.get(), 1);
}
