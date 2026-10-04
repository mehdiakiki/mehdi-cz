trait Limits {
    const MAX_RETRIES: u8;
}

struct Production;

impl Limits for Production {
    fn MAX_RETRIES() -> u8 {
        3
    }
}

fn main() {}
