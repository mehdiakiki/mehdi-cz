fn main() {
    let result = 8_u32.ilog(1);
    assert_eq!(result, 0, "ilog panics when its base is below two; checked_ilog reports None instead");
}
