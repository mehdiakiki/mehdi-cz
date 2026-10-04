struct UserId(u64);
struct OrderId(u64);

impl From<u64> for UserId {
    fn from(value: u64) -> Self {
        Self(value)
    }
}

impl From<u64> for OrderId {
    fn from(value: u64) -> Self {
        Self(value)
    }
}

fn main() {
    let id = 42_u64.into();
    let _ = id;
}
