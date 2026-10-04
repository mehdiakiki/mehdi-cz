use std::range::{legacy, RangeInclusive};

fn main() {
    let mut exhausted: legacy::RangeInclusive<i32> = 0..=0;
    assert_eq!(exhausted.next(), Some(0));
    let converted = RangeInclusive::from(exhausted);
    assert!(converted.is_empty());
}
