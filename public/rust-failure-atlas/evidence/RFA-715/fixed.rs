use std::range::{legacy, RangeInclusive};

fn main() {
    let mut legacy_range: legacy::RangeInclusive<i32> = 0..=0;
    assert_eq!(legacy_range.next(), Some(0));

    if legacy_range.is_empty() {
        println!("the exhausted iterator has no bounds value to convert");
    } else {
        let converted = RangeInclusive::from(legacy_range);
        println!("{}..={}", converted.start, converted.last);
    }
}
