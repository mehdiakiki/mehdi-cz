trait Tagged {}
trait Service: Tagged {}

struct Local;

impl Tagged for Local {}
impl Service for Local {}

fn main() {
    let _service: &dyn Service = &Local;
}
