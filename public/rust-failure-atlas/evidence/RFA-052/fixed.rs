fn clear_last(values: &mut Vec<i32>) {
    let last = values.len() - 1;
    values[last] = 0;
}

fn main() {
    let mut values = vec![10, 20, 30];
    clear_last(&mut values);
    assert_eq!(values, [10, 20, 0]);
}
