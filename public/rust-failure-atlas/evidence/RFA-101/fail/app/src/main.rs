fn load_user() -> model_v1::UserId {
    model_v2::UserId(42)
}

fn main() {
    let _ = load_user();
}
