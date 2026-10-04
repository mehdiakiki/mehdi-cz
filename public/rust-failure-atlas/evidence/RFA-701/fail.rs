use core::fmt::NumBuffer;

fn main() {
    let mut buffer = NumBuffer::new();
    let first = 1972_u32.format_into(&mut buffer);
    let second = 2026_u32.format_into(&mut buffer);
    println!("{first} -> {second}");
}
