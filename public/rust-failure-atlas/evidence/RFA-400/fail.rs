struct Wrapper<T>(T);
struct Special;

impl Drop for Wrapper<Special> {
    fn drop(&mut self) {}
}

fn main() {
    let _value = Wrapper(Special);
}
