pub const MAX_RECORD: usize = 1 << 20;

const fn crc_table() -> [u32; 256] {
    let mut table = [0u32; 256];
    let mut i = 0;
    while i < 256 {
        let mut c = i as u32;
        let mut bit = 0;
        while bit < 8 {
            c = if c & 1 != 0 { 0xEDB8_8320 ^ (c >> 1) } else { c >> 1 };
            bit += 1;
        }
        table[i] = c;
        i += 1;
    }
    table
}

const CRC_TABLE: [u32; 256] = crc_table();

pub fn crc32(data: &[u8]) -> u32 {
    let mut c = 0xFFFF_FFFFu32;
    for &byte in data {
        c = CRC_TABLE[((c ^ byte as u32) & 0xFF) as usize] ^ (c >> 8);
    }
    c ^ 0xFFFF_FFFF
}

#[derive(Clone, Copy, PartialEq)]
pub enum Format {
    Full,
    PayloadOnly,
}

fn checksum(format: Format, length: &[u8], payload: &[u8]) -> u32 {
    match format {
        Format::Full => crc32(&[length, payload].concat()),
        Format::PayloadOnly => crc32(payload),
    }
}

pub fn encode(format: Format, payload: &[u8]) -> Vec<u8> {
    let length = (payload.len() as u32).to_le_bytes();
    let mut out = Vec::with_capacity(8 + payload.len());
    out.extend_from_slice(&length);
    out.extend_from_slice(&checksum(format, &length, payload).to_le_bytes());
    out.extend_from_slice(payload);
    out
}

#[derive(Debug, PartialEq)]
pub enum Tail {
    Clean,
    ShortHeader,
    BadLength,
    ShortRecord,
    BadCrc,
}

pub struct Scan {
    pub payloads: Vec<Vec<u8>>,
    pub valid_end: usize,
    pub tail: Tail,
}

pub fn scan(format: Format, data: &[u8]) -> Scan {
    scan_records(format, data, true)
}

pub fn scan_without_crc(data: &[u8]) -> Scan {
    scan_records(Format::Full, data, false)
}

fn scan_records(format: Format, data: &[u8], verify: bool) -> Scan {
    let (mut payloads, mut pos) = (Vec::new(), 0);
    let tail = loop {
        if pos == data.len() {
            break Tail::Clean;
        }
        if data.len() - pos < 8 {
            break Tail::ShortHeader;
        }
        let length = u32::from_le_bytes(data[pos..pos + 4].try_into().unwrap()) as usize;
        if (format == Format::Full && length == 0) || length > MAX_RECORD {
            break Tail::BadLength;
        }
        if data.len() - pos - 8 < length {
            break Tail::ShortRecord;
        }
        let stored = u32::from_le_bytes(data[pos + 4..pos + 8].try_into().unwrap());
        let payload = &data[pos + 8..pos + 8 + length];
        if verify && checksum(format, &data[pos..pos + 4], payload) != stored {
            break Tail::BadCrc;
        }
        payloads.push(payload.to_vec());
        pos += 8 + length;
    };
    Scan { payloads, valid_end: pos, tail }
}
