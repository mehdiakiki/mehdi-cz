fn main() {
    let mut bytes = [1, 2, 3];
    let distance = 4 % bytes.len();
    bytes.rotate_left(distance);
    assert_eq!(bytes, [2, 3, 1]);
}
