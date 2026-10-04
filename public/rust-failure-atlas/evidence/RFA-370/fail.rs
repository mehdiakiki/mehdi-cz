trait Limits {
    const MAX: usize;
    fn accepts(&self, value: usize) -> bool {
        value <= Self::MAX
    }
}

struct Small;

impl Limits for Small {
    const MAX: usize = 8;
}

fn main() {
    let limits: &dyn Limits = &Small;
    assert!(limits.accepts(5));
}
