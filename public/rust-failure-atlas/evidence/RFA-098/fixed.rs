#[cfg(feature = "fast")]
fn backend() -> &'static str {
    "fast"
}

#[cfg(not(feature = "fast"))]
fn backend() -> &'static str {
    "portable"
}

fn main() {
    assert_eq!(backend(), "portable");
}
