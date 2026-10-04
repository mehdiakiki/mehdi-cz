fn main() {
    let value = [3.5_f32, 4.5];
    let [left, right] = value;
    assert_eq!((left, right), (3.5, 4.5));
}
