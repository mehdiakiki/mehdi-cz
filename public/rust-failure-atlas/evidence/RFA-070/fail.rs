struct Guard {
    value: String,
}

impl Drop for Guard {
    fn drop(&mut self) {}
}

fn take(guard: Guard) -> String {
    guard.value
}

fn main() {}
