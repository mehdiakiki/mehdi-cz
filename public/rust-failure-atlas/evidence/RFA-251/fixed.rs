fn main() {
    assert_eq!("left:right".splitn(0, ':').count(), 0);
    assert_eq!("left:right".splitn(1, ':').collect::<Vec<_>>(), ["left:right"]);
    assert_eq!("left:right".splitn(2, ':').collect::<Vec<_>>(), ["left", "right"]);
}
