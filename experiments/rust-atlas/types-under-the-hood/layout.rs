// Article 6: where a type becomes a layout.
use std::mem::{align_of, offset_of, size_of};

#[derive(Clone, Copy)]
struct Mixed { a: u8, b: u32, c: u16 }

#[repr(C)]
#[derive(Clone, Copy)]
struct MixedC { a: u8, b: u32, c: u16 }

// Same fields, declared in a different order, default representation.
struct Ordered { b: u32, c: u16, a: u8 }

#[repr(packed)]
struct Packed { a: u8, b: u32, c: u16 }

fn row(name: &str, size: usize, align: usize, a: usize, b: usize, c: usize) {
    println!("{name:<12} size {size:>2}  align {align:>2}  offsets a={a} b={b} c={c}");
}

fn main() {
    row("Mixed", size_of::<Mixed>(), align_of::<Mixed>(),
        offset_of!(Mixed, a), offset_of!(Mixed, b), offset_of!(Mixed, c));
    row("MixedC", size_of::<MixedC>(), align_of::<MixedC>(),
        offset_of!(MixedC, a), offset_of!(MixedC, b), offset_of!(MixedC, c));
    row("Ordered", size_of::<Ordered>(), align_of::<Ordered>(),
        offset_of!(Ordered, a), offset_of!(Ordered, b), offset_of!(Ordered, c));
    row("Packed", size_of::<Packed>(), align_of::<Packed>(),
        offset_of!(Packed, a), offset_of!(Packed, b), offset_of!(Packed, c));
    println!("sum of field sizes: {}", size_of::<u8>() + size_of::<u32>() + size_of::<u16>());
    println!("an array of 1000 Mixed:  {} bytes", size_of::<[Mixed; 1000]>());
    println!("an array of 1000 MixedC: {} bytes", size_of::<[MixedC; 1000]>());
}
