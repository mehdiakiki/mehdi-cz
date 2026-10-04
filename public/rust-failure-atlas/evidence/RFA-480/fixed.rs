fn outer() -> u8 {
    let offset = 7_u8;
    let inner = |value: u8| value + offset;
    inner(1)
}

fn main() { assert_eq!(outer(), 8); }
