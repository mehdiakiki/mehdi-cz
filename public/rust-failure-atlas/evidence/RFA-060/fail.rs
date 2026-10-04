fn values(compact: bool) -> impl Iterator<Item = u32> {
    if compact {
        0..3
    } else {
        vec![10, 20, 30].into_iter()
    }
}

fn main() {
    println!("{:?}", values(true).collect::<Vec<_>>());
}
