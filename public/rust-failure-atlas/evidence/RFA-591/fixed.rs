fn visit<F>(callback: F)
where
    F: Fn(i32),
{
    callback(7);
}

fn main() {
    visit(|value: i32| assert_eq!(value, 7));
}
