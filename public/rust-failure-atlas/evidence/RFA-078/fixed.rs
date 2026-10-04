const fn read_default() -> u32 {
    3
}

const DEFAULT: u32 = read_default();

fn main() {
    assert_eq!(DEFAULT, 3);
}
