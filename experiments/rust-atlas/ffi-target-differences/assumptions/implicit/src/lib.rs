//! A small library written on x86_64 Linux, with that target's assumptions
//! left implicit in the types and in one layout assertion.

use std::ffi::{CStr, c_int};
use std::fs::{File, Permissions};
use std::io;
use std::mem::size_of;
use std::os::unix::fs::PermissionsExt;
use std::sync::atomic::{AtomicU64, Ordering};

#[repr(C)]
pub struct Header {
    pub kind: u8,
    pub len: u64,
}

const _: () = assert!(size_of::<Header>() == 16, "Header must be 16 bytes");

unsafe extern "C" {
    fn puts(s: *const i8) -> c_int;
    fn labs(x: i64) -> i64;
}

pub fn greet(name: &CStr) -> c_int {
    unsafe { puts(name.as_ptr()) }
}

pub fn magnitude(x: i64) -> i64 {
    unsafe { labs(x) }
}

pub fn frame_len(bytes: [u8; 8]) -> u64 {
    u64::from_ne_bytes(bytes)
}

pub static REQUESTS: AtomicU64 = AtomicU64::new(0);

pub fn next_request() -> u64 {
    REQUESTS.fetch_add(1, Ordering::Relaxed)
}

pub fn make_private(file: &File) -> io::Result<()> {
    file.set_permissions(Permissions::from_mode(0o600))
}
