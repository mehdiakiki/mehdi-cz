// The same 32 bits read as two different types.
fn main() {
    let bits: u32 = 0xFFFF_FFFF;
    println!("the bits 0xFFFFFFFF as u32: {}", bits);
    println!("the same bits as i32:       {}", bits as i32);
    let a: u32 = 0xFFFF_FFFF;
    let b: u32 = 1;
    println!("as u32: {} < {} is {}", a, b, a < b);
    println!("as i32: {} < {} is {}", a as i32, b as i32, (a as i32) < (b as i32));
    println!("u32 addition wraps to: {}", a.wrapping_add(b));
    println!("i32 addition wraps to: {}", (a as i32).wrapping_add(b as i32));
    // A plain subtraction, so the build mode decides what happens.
    let zero: u32 = std::hint::black_box(0);
    let one: u32 = std::hint::black_box(1);
    println!("subtracting past zero as u32: {}", zero - one);
    println!("same 32 bits, same add instruction, two readings of the result");
}
