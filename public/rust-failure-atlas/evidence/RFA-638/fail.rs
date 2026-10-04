trait Identifier {
    fn zero() -> u64;
}

struct UserId;

impl Identifier for UserId {
    fn zero() -> u64 { 0 }
}

fn main() {
    let _value = Identifier::zero();
}
