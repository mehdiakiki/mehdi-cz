fn main() {
    let values: Vec<()> = Vec::with_capacity(8);

    assert_eq!(
        values.capacity(),
        8,
        "Vec of a zero-sized type reports usize::MAX capacity without allocating element storage"
    );
}
