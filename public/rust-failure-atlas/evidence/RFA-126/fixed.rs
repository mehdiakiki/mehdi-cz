use std::fmt::Display;

struct Wrapper<T: Display>(T);

impl<T: Display> Drop for Wrapper<T> {
    fn drop(&mut self) {
        println!("{}", self.0);
    }
}

fn main() {
    let _value = Wrapper(42);
}
