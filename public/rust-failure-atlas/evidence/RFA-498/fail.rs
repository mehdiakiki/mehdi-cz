trait Limits {
    const MAX_RETRIES: u8;
}

struct Production;

impl Limits for Production {
    type MAX_RETRIES = u8;
}

fn main() {}
