use std::fmt::Display;

struct Wrapper<T>(T);

impl<T: Display> Drop for Wrapper<T> {
    fn drop(&mut self) {
        println!("{}", self.0);
    }
}

fn main() {}
