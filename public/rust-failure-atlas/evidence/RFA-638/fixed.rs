trait Identifier {
    fn zero() -> u64;
}

struct UserId;

impl Identifier for UserId {
    fn zero() -> u64 { 0 }
}

fn main() {
    let value = <UserId as Identifier>::zero();
    assert_eq!(value, 0);
}
