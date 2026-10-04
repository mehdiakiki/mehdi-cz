mod session {
    pub struct Token;

    impl Token {
        pub fn new() -> Self {
            Self
        }

        pub fn rotate(&self) {}
    }
}

fn main() {
    session::Token::new().rotate();
}
