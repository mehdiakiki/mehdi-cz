mod internal {
    pub fn connect() -> bool { true }
    pub use connect as public_connect;
}

fn main() {
    assert!(internal::public_connect());
}
