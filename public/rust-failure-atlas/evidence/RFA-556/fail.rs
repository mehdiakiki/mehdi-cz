enum Guard {
    Active,
}

impl Drop for Guard {
    fn drop(&mut self) {}
}

struct Runtime {
    guard: Guard,
}

static RUNTIME: Runtime = Runtime {
    guard: (Guard::Active, Guard::Active).1,
};

fn main() {
    let _ = &RUNTIME;
}
