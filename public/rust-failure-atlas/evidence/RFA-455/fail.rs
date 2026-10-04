struct Parser;

impl Parser {
    fn default_code() -> u8 {
        0
    }
}

fn main() {
    match 0_u8 {
        Parser::default_code => println!("default"),
        _ => {}
    }
}
