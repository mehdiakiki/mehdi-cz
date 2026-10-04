fn main() {
    let mut values = [1, 2, 3, 4, 5];
    values.copy_within(0..3, 2);
    assert_eq!(values, [1, 2, 1, 2, 1], "copy_within reads the complete source as if it were copied through temporary storage when ranges overlap");
}
