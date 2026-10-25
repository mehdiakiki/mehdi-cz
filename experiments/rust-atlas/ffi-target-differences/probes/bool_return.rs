// An exported C function that returns a bool computed from the lowest bit.
#![no_std]

#[unsafe(no_mangle)]
pub extern "C" fn lowest_bit_is_set(flags: u8) -> bool {
    (flags & 0x1) == 0x1
}
