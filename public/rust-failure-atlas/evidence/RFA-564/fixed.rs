mod boundary {
    pub(in crate::boundary) struct Token;

    pub fn issue() {
        let _ = Token;
    }
}

fn main() {
    boundary::issue();
}
