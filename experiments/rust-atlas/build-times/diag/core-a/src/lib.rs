//! Small library with one optional feature and one compile-time env read.

/// Read at compile time -> Cargo records it as an env dependency of this unit.
pub const TAG: &str = match option_env!("DIAG_TAG") {
    Some(value) => value,
    None => "unset",
};

pub fn width() -> usize {
    if cfg!(feature = "fast") {
        64
    } else {
        16
    }
}

pub fn label() -> String {
    format!("core-a tag={TAG} width={}", width())
}
