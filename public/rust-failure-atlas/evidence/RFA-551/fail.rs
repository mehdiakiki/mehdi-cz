struct InternalRecord {
    value: u64,
}

pub trait Decode {
    type Record;
}

impl Decode for u64 {
    type Record = InternalRecord;
}

fn main() {}
