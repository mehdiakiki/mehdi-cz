struct Paused {
    calls: usize,
}

impl Iterator for Paused {
    type Item = u8;

    fn next(&mut self) -> Option<Self::Item> {
        self.calls += 1;
        match self.calls {
            1 => None,
            2 => Some(1),
            _ => None,
        }
    }
}

fn main() {
    let values: Vec<_> = Paused { calls: 0 }.chain([2]).collect();

    assert_eq!(
        values,
        vec![1, 2],
        "Iterator::chain switches permanently to the second iterator after the first None"
    );
}
