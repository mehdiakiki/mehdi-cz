use std::sync::Mutex;

fn main() {
    let state = Mutex::new(7);
    {
        let mut guard = state.lock().unwrap();
        *guard += 1;
    }

    assert_eq!(8, *state.try_lock().unwrap());
}
