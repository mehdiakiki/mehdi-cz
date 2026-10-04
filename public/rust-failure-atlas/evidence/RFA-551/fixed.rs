pub struct PublicRecord {
    pub value: u64,
}

pub trait Decode {
    type Record;
}

impl Decode for u64 {
    type Record = PublicRecord;
}

fn main() {
    let record = PublicRecord { value: 7 };
    assert_eq!(record.value, 7);
}
