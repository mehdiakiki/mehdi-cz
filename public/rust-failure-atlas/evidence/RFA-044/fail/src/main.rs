#[repr(u32)]
#[derive(Debug)]
enum Status {
    Ready = 0,
    Busy = 1,
}

impl TryFrom<u32> for Status {
    type Error = u32;

    fn try_from(raw: u32) -> Result<Self, Self::Error> {
        match raw {
            0 => Ok(Self::Ready),
            1 => Ok(Self::Busy),
            other => Err(other),
        }
    }
}

unsafe extern "C" {
    fn rfa_status() -> u32;
}

fn main() {
    assert_eq!(std::mem::size_of::<u32>(), 4);
    let raw = unsafe { rfa_status() };
    let _known = Status::try_from(raw).expect("foreign side returned new status 2");
}
