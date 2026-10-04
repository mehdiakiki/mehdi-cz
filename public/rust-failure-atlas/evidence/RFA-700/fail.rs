use core::range::Range;

fn main() {
    let owner = String::from("alpha beta");
    let equal_copy = String::from("beta");

    let observed = owner.substr_range(&equal_copy);
    assert_eq!(observed, Some(Range { start: 6, end: 10 }));
}
