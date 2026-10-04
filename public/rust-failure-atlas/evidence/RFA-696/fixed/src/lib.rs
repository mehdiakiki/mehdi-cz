#![no_std]

extern crate alloc;

use alloc::vec::Vec;

pub fn packet_size(bytes: Vec<u8>) -> usize {
    bytes.len()
}
