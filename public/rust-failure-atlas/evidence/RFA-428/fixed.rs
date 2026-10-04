#[derive(Clone)]
struct Batch {
    values: Vec<u8>,
}

fn main() {
    let first = Batch { values: vec![1, 2] };
    let second = first.clone();
    assert_eq!(second.values, [1, 2]);
}
