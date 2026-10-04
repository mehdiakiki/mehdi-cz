#![allow(unconditional_panic)]

const BROKEN: u32 = 10 / 0;

fn main() {
    println!("{BROKEN}");
}
