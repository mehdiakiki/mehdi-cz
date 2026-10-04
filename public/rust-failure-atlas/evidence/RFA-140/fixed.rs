macro_rules! match_literal {
    (3) => {
        "three"
    };
}

macro_rules! forward_token {
    ($value:tt) => {
        match_literal!($value)
    };
}

fn main() {
    assert_eq!("three", forward_token!(3));
}
