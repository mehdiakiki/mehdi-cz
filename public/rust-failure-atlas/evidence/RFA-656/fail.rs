use std::cell::Cell;

fn main() {
    let visited = Cell::new(0);
    let result: Result<Vec<_>, _> = (0..5)
        .map(|value| {
            visited.set(visited.get() + 1);
            if value == 2 { Err("bad value") } else { Ok(value) }
        })
        .collect();
    assert!(result.is_err());
    assert_eq!(visited.get(), 5, "collecting Result stops the iterator at the first error");
}
