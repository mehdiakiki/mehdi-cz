#[cfg(feature = "extra")]
pub fn greet() -> &'static str {
    helper::hello()
}
