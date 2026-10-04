#[derive(Clone, Copy)]
struct CleanupToken;

impl Drop for CleanupToken {
    fn drop(&mut self) {
        println!("cleanup");
    }
}

fn main() {}
