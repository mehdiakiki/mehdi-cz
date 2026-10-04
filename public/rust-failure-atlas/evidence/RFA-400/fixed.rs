struct Wrapper<T>(T);
struct Special;

impl<T> Drop for Wrapper<T> {
    fn drop(&mut self) {}
}

fn main() {
    let _value = Wrapper(Special);
}
