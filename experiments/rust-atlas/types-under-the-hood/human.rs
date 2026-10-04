pub enum Human { Man, Woman }

#[inline(never)]
pub fn greet(h: Human) -> &'static str {
    match h {
        Human::Man => "Hello sir",
        Human::Woman => "Hello madam",
    }
}

fn main() {
    println!("size of Human: {} byte", std::mem::size_of::<Human>());
    println!("{}", greet(Human::Man));
}
