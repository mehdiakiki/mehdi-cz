use core::range::Range;

fn main() {
    let owner = [10_u8, 20, 30, 40];
    let derived = &owner[1..3];

    assert_eq!(owner.subslice_range(derived), Some(Range { start: 1, end: 3 }));
}
