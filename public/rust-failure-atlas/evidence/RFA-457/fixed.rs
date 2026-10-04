fn main() {
    let values = [10, 20];
    let [first, second] = values;
    assert_eq!((first, second), (10, 20));
}
