// Article 7: the same generic, the same trait, compiled as a library so the
// symbols in the object file are easy to list.
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

// Force the generics to be instantiated for three element types.
pub fn use_first(a: &[u8], b: &[u64], c: &[f64]) -> (u8, u64, f64) {
    (first(a), first(b), first(c))
}
pub fn use_speak(d: &Dog, c: &Cat) -> u64 { speak_static(d) + speak_static(c) }
pub fn use_dyn(s: &dyn Speak) -> u64 { speak_dyn(s) }
pub fn make_dyn(d: &Dog) -> &dyn Speak { d }
