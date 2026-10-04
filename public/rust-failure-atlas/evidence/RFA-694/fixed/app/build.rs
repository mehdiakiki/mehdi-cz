fn main() {
    let include = std::env::var("DEP_RFA_WRAPPER_NATIVE_INCLUDE")
        .expect("the wrapper forwards metadata under its own links namespace");
    assert_eq!(include, "/verified/native/include");
}
