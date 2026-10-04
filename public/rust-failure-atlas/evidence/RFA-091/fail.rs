use std::cell::Cell;

static REQUESTS: Cell<u64> = Cell::new(0);

fn main() {
    REQUESTS.set(REQUESTS.get() + 1);
}
