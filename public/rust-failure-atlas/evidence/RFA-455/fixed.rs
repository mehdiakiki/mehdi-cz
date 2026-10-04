struct Parser;

impl Parser {
    fn default_code() -> u8 {
        0
    }
}

fn main() {
    let label = match 0_u8 {
        code if code == Parser::default_code() => "default",
        _ => "other",
    };
    assert_eq!(label, "default");
}
