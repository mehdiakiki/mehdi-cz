// When the overflow is visible inside one function body, the compiler refuses
// to build at all, in every build mode. This file must not compile.
fn main() {
    let x: u8 = 255;
    let y = x + 1;
    println!("{y}");
}
