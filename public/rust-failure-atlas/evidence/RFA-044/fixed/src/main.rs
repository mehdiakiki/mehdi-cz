#[derive(Debug, Eq, PartialEq)]
enum Status {
    Ready,
    Busy,
    Unknown(u32),
}

impl From<u32> for Status {
    fn from(raw: u32) -> Self {
        match raw {
            0 => Self::Ready,
            1 => Self::Busy,
            other => Self::Unknown(other),
        }
    }
}

unsafe extern "C" {
    fn rfa_status() -> u32;
}

fn main() {
    assert_eq!(std::mem::size_of::<u32>(), 4);
    let raw = unsafe { rfa_status() };
    assert_eq!(Status::from(raw), Status::Unknown(2));
    println!("unknown foreign status preserved as raw value {raw}");
}
