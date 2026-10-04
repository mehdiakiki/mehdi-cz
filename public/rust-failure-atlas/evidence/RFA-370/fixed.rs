trait Limits {
    fn max(&self) -> usize;
    fn accepts(&self, value: usize) -> bool {
        value <= self.max()
    }
}

struct Small;

impl Limits for Small {
    fn max(&self) -> usize {
        8
    }
}

fn main() {
    let limits: &dyn Limits = &Small;
    assert!(limits.accepts(5));
    assert_eq!(limits.max(), 8);
}
