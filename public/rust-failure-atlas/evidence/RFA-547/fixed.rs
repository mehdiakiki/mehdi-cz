fn consume(mut state: Option<u32>) {
    match state {
        None => {}
        Some(value) => {
            println!("{value}");
            state = None;
        }
    }

    assert_eq!(state, None);
}

fn main() {
    consume(Some(4));
}
