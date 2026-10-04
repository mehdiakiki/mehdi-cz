use core::fmt::NumBuffer;

fn main() {
    let mut buffer = NumBuffer::new();
    println!("{}", 1972_u32.format_into(&mut buffer));
    println!("{}", 2026_u32.format_into(&mut buffer));
}
