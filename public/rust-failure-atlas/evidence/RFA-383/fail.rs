trait Tagged<T: ?Sized> {}
trait Service: Tagged<Self> {}

struct Local;

impl Tagged<Local> for Local {}
impl Service for Local {}

fn main() {
    let _service: &dyn Service = &Local;
}
