#![deny(unexpected_cfgs)]

#[cfg(has_fast_path)]
pub const MODE: &str = "fast";

#[cfg(not(has_fast_path))]
pub const MODE: &str = "portable";
