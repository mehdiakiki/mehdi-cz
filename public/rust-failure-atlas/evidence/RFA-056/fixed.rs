use std::fmt;

#[derive(Debug)]
struct DecodeError;

impl fmt::Display for DecodeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("decode failed")
    }
}

#[derive(Debug)]
struct ServiceError {
    source: DecodeError,
}

impl From<DecodeError> for ServiceError {
    fn from(source: DecodeError) -> Self {
        Self { source }
    }
}

fn decode() -> Result<u32, DecodeError> {
    Err(DecodeError)
}

fn load() -> Result<u32, ServiceError> {
    let value = decode()?;
    Ok(value)
}

fn main() {
    let error = load().unwrap_err();
    assert_eq!(error.source.to_string(), "decode failed");
}
