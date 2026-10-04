#[derive(Clone)]
struct CleanupToken;

impl Drop for CleanupToken {
    fn drop(&mut self) {
        println!("cleanup");
    }
}

fn main() {
    let token = CleanupToken;
    let _second = token.clone();
}
