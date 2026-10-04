mod session {
    pub struct Token;

    impl Token {
        pub fn new() -> Self {
            Self
        }

        fn rotate(&self) {}
    }
}

fn main() {
    session::Token::new().rotate();
}
