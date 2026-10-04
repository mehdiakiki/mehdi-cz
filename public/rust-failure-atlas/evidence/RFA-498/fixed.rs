trait Limits {
    const MAX_RETRIES: u8;
}

struct Production;

impl Limits for Production {
    const MAX_RETRIES: u8 = 3;
}

fn main() {
    assert_eq!(Production::MAX_RETRIES, 3);
}
