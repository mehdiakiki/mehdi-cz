#[cfg(all(feature = "json", feature = "binary"))]
compile_error!("features json and binary cannot be enabled together");

pub fn enabled() -> bool {
    true
}
