use std::io::{self,Read};

pub struct TextOutput {pub text:String,pub truncated:bool,pub decoded_bytes_observed:usize}
pub fn read_text(reader:impl Read,max:usize)->io::Result<TextOutput> {
    let probe=max.checked_add(1).ok_or_else(||io::Error::other("limit overflow"))?;
    let mut bytes=Vec::new();reader.take(probe as u64).read_to_end(&mut bytes)?;
    let truncated=bytes.len()>max;let prefix=&bytes[..bytes.len().min(max)];
    let text=match std::str::from_utf8(prefix) {
        Ok(value)=>value.to_owned(),
        Err(error)if truncated&&error.error_len().is_none()=>std::str::from_utf8(&prefix[..error.valid_up_to()]).unwrap().to_owned(),
        Err(_)=>return Err(io::Error::new(io::ErrorKind::InvalidData,"invalid text encoding")),
    };
    Ok(TextOutput{text,truncated,decoded_bytes_observed:bytes.len()})
}
