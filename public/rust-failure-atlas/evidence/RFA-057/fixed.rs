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
    let id: UserId = 42_u64.into();
    assert_eq!(id.0, 42);

    let order = OrderId::from(7);
    assert_eq!(order.0, 7);
}
