macro_rules! match_literal {
    (3) => {
        "three"
    };
}

macro_rules! forward_expression {
    ($value:expr) => {
        match_literal!($value)
    };
}

fn main() {
    println!("{}", forward_expression!(3));
}
