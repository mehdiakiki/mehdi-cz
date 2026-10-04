// Article 7: two ways to make a type disappear.
pub trait Speak { fn speak(&self) -> u64; }

pub struct Dog;
pub struct Cat;
impl Speak for Dog { fn speak(&self) -> u64 { 1 } }
impl Speak for Cat { fn speak(&self) -> u64 { 2 } }

#[inline(never)]
pub fn first<T: Copy>(xs: &[T]) -> T { xs[0] }

#[inline(never)]
pub fn speak_static<S: Speak>(s: &S) -> u64 { s.speak() }

#[inline(never)]
pub fn speak_dyn(s: &dyn Speak) -> u64 { s.speak() }

fn main() {
    let bytes = [7u8, 8, 9];
    let longs = [7u64, 8, 9];
    let floats = [7.5f64, 8.5];
    println!("first: {} {} {}", first(&bytes), first(&longs), first(&floats));
    println!("static dispatch: {} {}", speak_static(&Dog), speak_static(&Cat));
    let animals: [&dyn Speak; 2] = [&Dog, &Cat];
    println!("dynamic dispatch: {} {}", speak_dyn(animals[0]), speak_dyn(animals[1]));
    println!("size of &Dog {} / &dyn Speak {}",
        std::mem::size_of::<&Dog>(), std::mem::size_of::<&dyn Speak>());
}
