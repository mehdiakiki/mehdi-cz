fn main() {
    let values = [10, 20, 30, 40];
    let [first, second, ..] = values;
    assert_eq!((first, second), (10, 20));
}
