use std::{env, fs, path::PathBuf};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("cargo::rerun-if-changed=schema/api.txt");
    println!("cargo::rerun-if-changed=template.cfg");
    let schema = fs::read_to_string("schema/api.txt")
        .map_err(|error| format!("required schema/api.txt: {error}"))?;
    let value: i32 = fs::read_to_string("template.cfg")
        .map_err(|error| format!("required template.cfg: {error}"))?
        .trim()
        .parse()?;
    let mut generated = String::new();
    for name in schema.lines() {
        if name.is_empty()
            || name.len() > 16
            || !name
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_')
        {
            return Err("invalid fixture API name".into());
        }
        generated.push_str(&format!("pub fn api_{name}() -> i32 {{ {value} }}\n"));
    }
    let output = PathBuf::from(env::var("OUT_DIR")?);
    let temporary = output.join("client.rs.tmp");
    fs::write(&temporary, generated)?;
    fs::rename(temporary, output.join("client.rs"))?;
    Ok(())
}
