struct Record(u32);

fn requires_sized<T: Sized>(_value: T) {}

fn main() {
    requires_sized(Record(7));
}
