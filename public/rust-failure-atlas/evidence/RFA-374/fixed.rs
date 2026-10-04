enum Never {}

fn explain(value: Never) -> ! {
    match value {}
}

fn main() {
    let _function: fn(Never) -> ! = explain;
}
