fn load_user() -> model::UserId {
    model::UserId(42)
}

fn main() {
    assert_eq!(load_user().0, 42);
}
