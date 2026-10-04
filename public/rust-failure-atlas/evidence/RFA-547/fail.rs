fn consume(mut state: Option<u32>) {
    match state {
        None => {}
        Some(_) if {
            state = None;
            false
        } => {}
        Some(value) => println!("{value}"),
    }
}

fn main() {
    consume(Some(4));
}
