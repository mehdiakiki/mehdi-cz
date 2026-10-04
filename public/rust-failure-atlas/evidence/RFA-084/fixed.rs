fn main() {
    // Safety: this single-threaded program has not created any other threads.
    unsafe { std::env::set_var("RFA_MODE", "verified") };
    assert_eq!(std::env::var("RFA_MODE").as_deref(), Ok("verified"));
}
