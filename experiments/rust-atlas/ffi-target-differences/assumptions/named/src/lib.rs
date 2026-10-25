//! A small library with each target assumption written in the types or
//! checked by the compiler.

use std::ffi::{CStr, c_char, c_int, c_long};
use std::fs::File;
use std::io;
use std::sync::atomic::{AtomicU64, Ordering};

pub struct Header {
    pub kind: u8,
    pub len: u64,
}

impl Header {
    pub fn encode(&self) -> [u8; 9] {
        let mut out = [0u8; 9];
        out[0] = self.kind;
        out[1..].copy_from_slice(&self.len.to_le_bytes());
        out
    }
}

unsafe extern "C" {
    fn puts(s: *const c_char) -> c_int;
    fn labs(x: c_long) -> c_long;
}

pub fn greet(name: &CStr) -> c_int {
    unsafe { puts(name.as_ptr()) }
}

pub fn magnitude(x: c_long) -> c_long {
    unsafe { labs(x) }
}

pub fn frame_len(bytes: [u8; 8]) -> u64 {
    u64::from_le_bytes(bytes)
}

#[cfg(not(target_has_atomic = "64"))]
compile_error!("this crate counts requests with a 64-bit atomic");

pub static REQUESTS: AtomicU64 = AtomicU64::new(0);

pub fn next_request() -> u64 {
    REQUESTS.fetch_add(1, Ordering::Relaxed)
}

#[cfg(unix)]
pub fn make_private(file: &File) -> io::Result<()> {
    use std::fs::Permissions;
    use std::os::unix::fs::PermissionsExt;
    file.set_permissions(Permissions::from_mode(0o600))
}

#[cfg(not(unix))]
pub fn make_private(_file: &File) -> io::Result<()> {
    Err(io::Error::new(
        io::ErrorKind::Unsupported,
        "file modes exist only on Unix targets",
    ))
}
