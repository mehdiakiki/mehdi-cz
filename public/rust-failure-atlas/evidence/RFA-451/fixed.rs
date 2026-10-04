fn main() {
    match (0, 7) {
        (0, ref value) | (ref value, 0) => println!("{value}"),
        _ => {}
    }
}
