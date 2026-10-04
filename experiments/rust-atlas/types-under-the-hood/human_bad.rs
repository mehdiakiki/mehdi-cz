pub enum Human { Man, Woman }
fn greet(h: Human) -> &'static str { match h { Human::Man => "Hello sir", Human::Woman => "Hello madam" } }
fn main() { println!("{}", greet(Human::Child)); }
