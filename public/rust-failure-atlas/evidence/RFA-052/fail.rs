fn clear_last(values: &mut Vec<i32>) {
    values[values.len() - 1] = 0;
}

fn main() {
    let mut values = vec![10, 20, 30];
    clear_last(&mut values);
}
