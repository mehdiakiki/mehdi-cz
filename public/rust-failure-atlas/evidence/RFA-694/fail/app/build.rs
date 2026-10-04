fn main() {
    std::env::var("DEP_RFA_NATIVE_INCLUDE")
        .expect("transitive DEP_RFA_NATIVE_INCLUDE is unavailable");
}
