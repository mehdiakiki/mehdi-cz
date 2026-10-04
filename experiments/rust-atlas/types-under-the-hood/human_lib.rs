pub enum Human { Man, Woman }

#[no_mangle]
pub fn greet(h: Human) -> &'static str {
    match h {
        Human::Man => "Hello sir",
        Human::Woman => "Hello madam",
    }
}
