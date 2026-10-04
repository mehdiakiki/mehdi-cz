fn stepped(values: impl Iterator<Item = u8>, step: usize) -> Option<Vec<u8>> {
    (step != 0).then(|| values.step_by(step).collect())
}

fn main() {
    assert_eq!(stepped(0..4, 0), None);
    assert_eq!(stepped(0..6, 2), Some(vec![0, 2, 4]));
}
