fn main() {
    let mut values = Vec::with_capacity(32);
    values.extend([10_u8, 20, 30]);
    assert!(values.capacity() > values.len());
    let round_trip = values.into_boxed_slice().into_vec();
    assert_eq!(round_trip, [10, 20, 30]);
    assert_eq!(round_trip.capacity(), round_trip.len());
}
