fn main() {
    match (0, 7) {
        (0, ref value) | (value, 0) => println!("{value}"),
        _ => {}
    }
}
