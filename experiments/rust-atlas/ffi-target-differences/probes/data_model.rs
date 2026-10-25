// Computes data-model facts for the compilation target in const context and
// stores them as one line of ASCII text in the object file.
#![no_std]

use core::ffi::{c_char, c_int, c_long};
use core::mem::{align_of, size_of};

#[repr(C)]
pub struct Header {
    pub kind: u8,
    pub len: u64,
}

#[cfg(target_has_atomic = "64")]
const ATOMIC_U64_ALIGN: usize = align_of::<core::sync::atomic::AtomicU64>();
#[cfg(not(target_has_atomic = "64"))]
const ATOMIC_U64_ALIGN: usize = 0;

const LEN: usize = 256;

struct Line {
    bytes: [u8; LEN],
    at: usize,
}

impl Line {
    const fn text(mut self, s: &[u8]) -> Line {
        let mut i = 0;
        while i < s.len() {
            self.bytes[self.at] = s[i];
            self.at += 1;
            i += 1;
        }
        self
    }

    const fn num(mut self, n: usize) -> Line {
        let mut digits = [0u8; 20];
        let mut count = 0;
        let mut rest = n;
        loop {
            digits[count] = b'0' + (rest % 10) as u8;
            count += 1;
            rest /= 10;
            if rest == 0 {
                break;
            }
        }
        while count > 0 {
            count -= 1;
            self.bytes[self.at] = digits[count];
            self.at += 1;
        }
        self
    }

    const fn hex_byte(mut self, b: u8) -> Line {
        let hex = b"0123456789abcdef";
        self.bytes[self.at] = hex[(b >> 4) as usize];
        self.bytes[self.at + 1] = hex[(b & 0x0f) as usize];
        self.at += 2;
        self
    }
}

const fn report() -> [u8; LEN] {
    let c_char_kind: &[u8] = if (c_char::MIN as i32) < 0 { b"i8" } else { b"u8" };
    let line = Line { bytes: [0; LEN], at: 0 };
    let line = line
        .text(b"data-model: c_char=")
        .text(c_char_kind)
        .text(b" c_int=")
        .num(size_of::<c_int>())
        .text(b" c_long=")
        .num(size_of::<c_long>())
        .text(b" usize=")
        .num(size_of::<usize>())
        .text(b" align_u64=")
        .num(align_of::<u64>())
        .text(b" align_f64=")
        .num(align_of::<f64>())
        .text(b" align_u128=")
        .num(align_of::<u128>())
        .text(b" align_AtomicU64=");
    let line = if ATOMIC_U64_ALIGN == 0 {
        line.text(b"none")
    } else {
        line.num(ATOMIC_U64_ALIGN)
    };
    let line = line
        .text(b" size_Header=")
        .num(size_of::<Header>())
        .text(b" first_byte_of_0x01020304=")
        .hex_byte(0x0102_0304u32.to_ne_bytes()[0])
        .text(b" end");
    line.bytes
}

#[used]
#[unsafe(no_mangle)]
pub static DATA_MODEL_REPORT: [u8; LEN] = report();
