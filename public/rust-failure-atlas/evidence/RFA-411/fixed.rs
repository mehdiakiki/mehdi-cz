fn main() {
    let values = [1_u32, 2, 3];
    let slice: &[u32] = &values;
    assert_eq!(std::mem::size_of_val(slice), slice.len() * std::mem::size_of::<u32>());
    assert_eq!(std::mem::size_of_val(&slice), std::mem::size_of::<&[u32]>());
}
