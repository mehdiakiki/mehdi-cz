trait Observable {
    fn label(&self) -> &'static str {
        "observable"
    }
}

trait Service: Observable {}

struct Api;

impl Observable for Api {}
impl Service for Api {}

fn label(service: &dyn Service) -> &'static str {
    service.label()
}

fn main() {
    assert_eq!(label(&Api), "observable");
}
