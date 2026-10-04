#![allow(dead_code)]

// `pub` is Rust module visibility. It does not define a stable linker name.
// `link-dead-code` makes this otherwise-unused Rust item visible in the
// no-LTO archive, which exposes the misleading observation behind this case.
pub extern "C" fn plugin_initialize() -> i32 {
    39
}
