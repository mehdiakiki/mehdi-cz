pub fn enabled() -> bool {
    cfg!(any(feature = "read-json", feature = "write-binary"))
}
