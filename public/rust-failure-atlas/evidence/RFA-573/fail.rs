fn apply<F>(input: u32, operation: F) -> u32
where
    F: Fn(u32) -> u32,
{
    operation(input)
}

fn main() {
    let answer = apply(41, || 42);
    println!("{answer}");
}
