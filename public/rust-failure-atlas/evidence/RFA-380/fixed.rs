trait Service {
    fn name(&self) -> &'static str;
    fn concrete_only(self)
    where
        Self: Sized,
    {}
}

struct Local;

impl Service for Local {
    fn name(&self) -> &'static str { "local" }
}

fn main() {
    Local.concrete_only();
    let service: &dyn Service = &Local;
    assert_eq!(service.name(), "local");
}
