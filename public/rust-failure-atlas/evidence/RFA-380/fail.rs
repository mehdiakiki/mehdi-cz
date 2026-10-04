trait Service: Sized {
    fn name(&self) -> &'static str;
}

struct Local;

impl Service for Local {
    fn name(&self) -> &'static str { "local" }
}

fn main() {
    let service: &dyn Service = &Local;
    assert_eq!(service.name(), "local");
}
