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
    guard: Guard::Active,
};

fn main() {
    let _ = &RUNTIME.guard;
}
