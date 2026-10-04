fn main() {
    let include = std::env::var("DEP_RFA_NATIVE_INCLUDE")
        .expect("the wrapper is the sys crate's immediate dependent");
    println!("cargo::metadata=include={include}");
}
