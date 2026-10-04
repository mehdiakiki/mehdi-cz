use std::cell::Cell;

fn build_error(constructions: &Cell<u32>) -> String {
    constructions.set(constructions.get() + 1);
    "feature is disabled".to_owned()
}

fn main() {
    let constructions = Cell::new(0);

    let result = true.ok_or(build_error(&constructions));

    assert_eq!(result, Ok(()));
    assert_eq!(
        constructions.get(),
        0,
        "true.ok_or still evaluated the error expression"
    );
}
