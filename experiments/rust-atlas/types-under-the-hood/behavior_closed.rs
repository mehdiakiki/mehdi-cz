// Article 5: the state is a type, so the wrong operation is a compile error.
// This file must not compile.
use std::marker::PhantomData;
pub struct Closed;
pub struct Open;
pub struct Door<State> { id: u32, _state: PhantomData<State> }
impl Door<Closed> {
    pub fn new(id: u32) -> Self { Door { id, _state: PhantomData } }
    pub fn open(self) -> Door<Open> { Door { id: self.id, _state: PhantomData } }
}
impl Door<Open> {
    pub fn walk_through(&self) -> u32 { self.id }
}
fn main() {
    let door = Door::<Closed>::new(7);
    door.walk_through();
}
