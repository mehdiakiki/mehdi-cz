// A use-after-free written in safe Rust.
// Build with: rustc use_after_free.rs
struct Request {
  user: String,
}

fn main() {
  let first = Request { user: String::from("alice") };
  drop(first);

  // A later step uses the value after it is gone. This is the bug.
  println!("user still reads as: {}", first.user);
}
