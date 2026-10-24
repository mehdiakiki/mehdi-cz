use std::range::{legacy, RangeInclusive};

fn main() {
    let mut iterator: legacy::RangeInclusive<i32> = 0..=0;
    assert_eq!(iterator.next(), Some(0));

    // The interval was 0..=0, but iteration has consumed it.
    let bounds = RangeInclusive::from(iterator);
    assert_eq!(
        (bounds.start, bounds.last),
        (0, 0),
        "the original bounds were not recovered"
    );
}
