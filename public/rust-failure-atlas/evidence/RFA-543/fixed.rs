fn main() {
    let mut count = 4_u32;
    let counter = &mut count;
    *counter += 1;

    let next = count + 1;
    assert_eq!(next, 6);
}
