use std::env;

fn cargo_value(name: &str) -> String {
    env::var(name).unwrap_or_else(|_| "(not set)".to_string())
}

fn main() {
    println!("cargo::rerun-if-changed=build.rs");
    println!(
        "cargo::warning=HOST={} TARGET={}",
        cargo_value("HOST"),
        cargo_value("TARGET")
    );
    println!(
        "cargo::warning=cfg!(target_os = \"linux\") = {}, CARGO_CFG_TARGET_OS = {}",
        cfg!(target_os = "linux"),
        cargo_value("CARGO_CFG_TARGET_OS")
    );
    println!(
        "cargo::warning=cfg!(target_arch = \"x86_64\") = {}, CARGO_CFG_TARGET_ARCH = {}",
        cfg!(target_arch = "x86_64"),
        cargo_value("CARGO_CFG_TARGET_ARCH")
    );
    println!(
        "cargo::warning=cfg!(target_pointer_width = \"64\") = {}, CARGO_CFG_TARGET_POINTER_WIDTH = {}",
        cfg!(target_pointer_width = "64"),
        cargo_value("CARGO_CFG_TARGET_POINTER_WIDTH")
    );

    println!("cargo::rustc-check-cfg=cfg(ptr64_by_cfg_macro, ptr64_by_cargo_cfg)");
    if cfg!(target_pointer_width = "64") {
        println!("cargo::rustc-cfg=ptr64_by_cfg_macro");
    }
    if env::var("CARGO_CFG_TARGET_POINTER_WIDTH").as_deref() == Ok("64") {
        println!("cargo::rustc-cfg=ptr64_by_cargo_cfg");
    }
}
