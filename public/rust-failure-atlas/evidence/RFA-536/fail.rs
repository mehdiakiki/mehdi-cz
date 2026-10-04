trait Observable {
    fn label(&self) -> &'static str {
        "observable"
    }
}

trait Service: Observable {}

impl Observable for dyn Service {}

fn main() {}
