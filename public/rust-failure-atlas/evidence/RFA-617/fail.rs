fn starts_with_marker<const N: usize>(values: [u8; N]) -> bool {
    matches!(values, [7, ..])
}

fn main() {}
