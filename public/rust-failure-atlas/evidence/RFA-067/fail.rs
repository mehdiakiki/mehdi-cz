use std::fmt::Display;

trait Encode {}

impl<T: Display> Encode for T {}

impl Encode for Vec<u8> {}

fn main() {}
