pub enum Human { Man, Woman }
fn main() {
    println!("size of Human: {}", std::mem::size_of::<Human>());
    println!("size of Option<Human>: {}", std::mem::size_of::<Option<Human>>());
    println!("size of u8: {}", std::mem::size_of::<u8>());
    println!("Man as byte: {}, Woman as byte: {}", Human::Man as u8, Human::Woman as u8);
}
