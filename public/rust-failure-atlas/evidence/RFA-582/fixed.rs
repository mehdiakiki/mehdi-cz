fn main() {
    let attempts = 3_u32;
    let borrowed = &attempts;
    assert_eq!(*borrowed, 3);
}
