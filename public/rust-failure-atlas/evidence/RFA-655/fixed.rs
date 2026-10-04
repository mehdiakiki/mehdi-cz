fn main() {
    let values = [10, 20, 30, 40];
    assert_eq!(values.get(1), Some(&20));
    assert_eq!(values.get(2), Some(&30));
}
