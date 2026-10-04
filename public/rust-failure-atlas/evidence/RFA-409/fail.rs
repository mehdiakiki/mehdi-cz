fn main() {
    let mut values = Vec::with_capacity(32);
    values.extend([10_u8, 20, 30]);
    let original_capacity = values.capacity();
    let round_trip = values.into_boxed_slice().into_vec();
    assert_eq!(round_trip.len(), 3);
    assert_eq!(round_trip.capacity(), original_capacity, "Vec::into_boxed_slice removes excess vector capacity");
}
