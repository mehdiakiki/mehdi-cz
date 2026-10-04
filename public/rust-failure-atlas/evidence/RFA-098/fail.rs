#[cfg(feature = "fast")]
fn backend() -> &'static str {
    "fast"
}

fn main() {
    assert_eq!(backend(), "fast");
}
