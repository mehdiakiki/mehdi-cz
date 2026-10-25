use std::env;
use std::fs;
use std::path::PathBuf;

fn main() {
    println!("cargo::rerun-if-changed=../shared/greeting.txt");
    println!("cargo::rerun-if-env-changed=GREETING_STYLE");
    let text = fs::read_to_string("../shared/greeting.txt").expect("greeting.txt is readable");
    let style = env::var("GREETING_STYLE").unwrap_or_else(|_| "plain".to_string());
    let greeting = match style.as_str() {
        "loud" => text.trim().to_uppercase(),
        _ => text.trim().to_string(),
    };
    let out_dir = PathBuf::from(env::var_os("OUT_DIR").expect("Cargo sets OUT_DIR"));
    let source = format!("const GREETING: &str = {greeting:?};\n");
    fs::write(out_dir.join("greeting.rs"), source).expect("OUT_DIR is writable");
}
