fn main() {
    let increment = 3_u32;
    let add = move |value: u32| increment + value;
    assert_eq!(add(4), 7);
}
