const fn checked_ratio(left: u32, right: u32) -> Option<u32> {
    left.checked_div(right)
}

const RATIO: Option<u32> = checked_ratio(10, 0);

fn main() {
    assert_eq!(RATIO, None);
}
