use core::range::Range;

fn main() {
    let owner = String::from("alpha beta");
    let derived = &owner[6..10];

    assert_eq!(owner.substr_range(derived), Some(Range { start: 6, end: 10 }));
}
