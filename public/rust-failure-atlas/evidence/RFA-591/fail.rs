fn visit<F>(callback: F)
where
    F: Fn(i32),
{
    callback(7);
}

fn main() {
    visit(|value: &str| println!("{value}"));
}
