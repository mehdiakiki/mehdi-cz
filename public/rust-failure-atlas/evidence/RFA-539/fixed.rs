trait Resource {}
trait Reads: Resource {}
trait Writes: Resource {}

struct Store;

impl Resource for Store {}
impl Reads for Store {}
impl Writes for Store {}

fn require_both<T: Reads + Writes>(_value: &T) {}

fn main() {
    require_both(&Store);
}
