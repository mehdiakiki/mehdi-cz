use std::io::{self, Read};

pub fn read_bounded(reader: impl Read, max: usize) -> io::Result<Vec<u8>> {
    let probe = max.checked_add(1)
        .ok_or_else(|| io::Error::other("limit is too large"))?;
    let mut bytes = Vec::new();
    reader.take(probe as u64).read_to_end(&mut bytes)?;
    if bytes.len() > max {
        return Err(io::Error::new(io::ErrorKind::InvalidData, "response exceeds byte limit"));
    }
    Ok(bytes)
}

pub fn decoded_http(url: &str, wire_limit: usize, decoded_limit: usize) -> io::Result<Vec<u8>> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_millis(300))
        .build().map_err(io::Error::other)?;
    let response = client.get(url).send().and_then(|response| response.error_for_status()).map_err(io::Error::other)?;
    let coding = response.headers().get("content-encoding").map(|value| value.to_str()).transpose()
        .map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "invalid content coding"))?;
    let gzip = match coding {
        Some(value) if value.eq_ignore_ascii_case("gzip") => true,
        None => false,
        Some(value) if value.eq_ignore_ascii_case("identity") => false,
        Some(_) => return Err(io::Error::new(io::ErrorKind::InvalidData, "unsupported content coding")),
    };
    let wire = read_bounded(response, wire_limit)?;
    if gzip {
        read_bounded(flate2::read::MultiGzDecoder::new(wire.as_slice()), decoded_limit)
    } else {
        read_bounded(wire.as_slice(), decoded_limit)
    }
}
