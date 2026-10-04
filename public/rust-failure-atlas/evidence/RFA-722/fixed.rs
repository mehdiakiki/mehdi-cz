use std::cell::Cell;

fn build_error(constructions: &Cell<u32>) -> String {
    constructions.set(constructions.get() + 1);
    "feature is disabled".to_owned()
}

fn main() {
    let constructions = Cell::new(0);

    let enabled = true.ok_or_else(|| build_error(&constructions));
    assert_eq!(enabled, Ok(()));
    assert_eq!(constructions.get(), 0);

    let disabled = false.ok_or_else(|| build_error(&constructions));
    assert_eq!(disabled, Err("feature is disabled".to_owned()));
    assert_eq!(constructions.get(), 1);
}
