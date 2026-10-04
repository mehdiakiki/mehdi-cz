fn values(compact: bool) -> Box<dyn Iterator<Item = u32>> {
    if compact {
        Box::new(0..3)
    } else {
        Box::new(vec![10, 20, 30].into_iter())
    }
}

fn main() {
    assert_eq!(values(true).collect::<Vec<_>>(), [0, 1, 2]);
    assert_eq!(values(false).collect::<Vec<_>>(), [10, 20, 30]);
}
