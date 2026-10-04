type Update = fn(value: u32) -> u32;

fn increment(mut value: u32) -> u32 {
    value += 1;
    value
}

fn main() {
    let update: Update = increment;
    assert_eq!(update(2), 3);
}
