// One atomic load and one atomic store, each with a weak and a strong ordering.
#![no_std]

use core::sync::atomic::{AtomicU32, Ordering};

#[unsafe(no_mangle)]
pub fn load_relaxed(flag: &AtomicU32) -> u32 {
    flag.load(Ordering::Relaxed)
}

#[unsafe(no_mangle)]
pub fn load_acquire(flag: &AtomicU32) -> u32 {
    flag.load(Ordering::Acquire)
}

#[unsafe(no_mangle)]
pub fn store_relaxed(flag: &AtomicU32, value: u32) {
    flag.store(value, Ordering::Relaxed)
}

#[unsafe(no_mangle)]
pub fn store_release(flag: &AtomicU32, value: u32) {
    flag.store(value, Ordering::Release)
}
