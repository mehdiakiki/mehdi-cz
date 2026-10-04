// Article 3: a type is a set. Count the members, then ask the compiler how
// many bytes it needs. The size follows the count, with one twist.
use std::mem::size_of;
use std::num::NonZeroU8;

#[allow(dead_code)]
#[derive(Clone, Copy)]
enum Human { Man, Woman }

#[allow(dead_code)]
enum Void {}

fn main() {
    println!("{:<28} {:>8} {:>6}", "type", "members", "bytes");
    println!("{:<28} {:>8} {:>6}", "Void", 0, size_of::<Void>());
    println!("{:<28} {:>8} {:>6}", "()", 1, size_of::<()>());
    println!("{:<28} {:>8} {:>6}", "bool", 2, size_of::<bool>());
    println!("{:<28} {:>8} {:>6}", "Human", 2, size_of::<Human>());
    println!("{:<28} {:>8} {:>6}", "Option<Human>", 3, size_of::<Option<Human>>());
    println!("{:<28} {:>8} {:>6}", "(bool, Human)", 4, size_of::<(bool, Human)>());
    println!("{:<28} {:>8} {:>6}", "Result<Human, bool>", 4, size_of::<Result<Human, bool>>());
    println!("{:<28} {:>8} {:>6}", "u8", 256, size_of::<u8>());
    println!("{:<28} {:>8} {:>6}", "Option<NonZeroU8>", 256, size_of::<Option<NonZeroU8>>());
    println!("{:<28} {:>8} {:>6}", "Option<u8>", 257, size_of::<Option<u8>>());
    println!("{:<28} {:>8} {:>6}", "(u8, bool)", 512, size_of::<(u8, bool)>());
    println!("{:<28} {:>8} {:>6}", "Result<u8, Void>", 256, size_of::<Result<u8, Void>>());
    println!("{:<28} {:>8} {:>6}", "u16", 65536, size_of::<u16>());
    println!("{:<28} {:>8} {:>6}", "(u8, u32)", "2^40", size_of::<(u8, u32)>());
}
