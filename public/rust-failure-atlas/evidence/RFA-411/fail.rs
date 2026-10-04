fn main() {
    let values = [1_u32, 2, 3];
    let slice: &[u32] = &values;
    assert_eq!(std::mem::size_of_val(slice), std::mem::size_of::<u32>(), "size_of_val on a slice counts every element in its dynamic length");
}
