struct Guard {
    value: Option<String>,
}

impl Drop for Guard {
    fn drop(&mut self) {}
}

fn take(mut guard: Guard) -> String {
    guard.value.take().unwrap()
}

fn main() {
    let guard = Guard {
        value: Some(String::from("atlas")),
    };
    assert_eq!(take(guard), "atlas");
}
