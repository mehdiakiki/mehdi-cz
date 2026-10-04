fn main() {
    let owned = vec![1_u8, 2];
    let borrowed = &owned;

    let _combined: Vec<_> = borrowed.iter().chain(owned.into_iter()).collect();
}
