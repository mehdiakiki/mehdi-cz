use core::range::Range;

fn main() {
    let owner = [10_u8, 20, 30, 40];
    let equal_copy = [20_u8, 30];

    let observed = owner.subslice_range(&equal_copy);
    assert_eq!(observed, Some(Range { start: 1, end: 3 }));
}
