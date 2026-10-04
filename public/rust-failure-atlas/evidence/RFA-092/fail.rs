use std::sync::Arc;

fn main() {
    let values = Arc::new(vec![1, 2]);
    values.push(3);
}
