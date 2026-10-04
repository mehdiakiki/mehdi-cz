fn outer() {
    let offset = 7_u8;
    fn inner(value: u8) -> u8 {
        value + offset
    }
    println!("{}", inner(1));
}

fn main() { outer(); }
