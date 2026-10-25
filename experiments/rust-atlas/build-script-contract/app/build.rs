use std::env;

fn main() {
    println!("cargo::rerun-if-changed=build.rs");
    println!("cargo::rustc-check-cfg=cfg(dep_answer_version, values(\"1\", \"2\"))");
    match env::var("DEP_ANSWER_VERSION") {
        Ok(version) => {
            println!("cargo::warning=DEP_ANSWER_VERSION={version}");
            println!("cargo::rustc-cfg=dep_answer_version=\"{version}\"");
        }
        Err(_) => println!("cargo::warning=DEP_ANSWER_VERSION is not set"),
    }
    println!("cargo::rustc-env=APP_LABEL=set by app/build.rs");
    println!("cargo::rustc-link-arg=-Wl,--defsym=link_arg_from_app=0x2a");
}
