use std::fmt;

#[derive(Debug)]
struct DecodeError;

impl fmt::Display for DecodeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("decode failed")
    }
}

#[derive(Debug)]
struct ServiceError;

fn decode() -> Result<u32, DecodeError> {
    Err(DecodeError)
}

fn load() -> Result<u32, ServiceError> {
    let value = decode()?;
    Ok(value)
}

fn main() {
    let _ = load();
}
