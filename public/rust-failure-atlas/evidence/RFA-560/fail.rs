type Update = fn(mut value: u32) -> u32;

fn increment(value: u32) -> u32 {
    value + 1
}

fn main() {
    let update: Update = increment;
    assert_eq!(update(2), 3);
}
