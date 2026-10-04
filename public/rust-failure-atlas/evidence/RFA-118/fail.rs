#[repr(transparent)]
struct UserId {
    raw: u64,
    shard: u16,
}

fn main() {
    let _ = UserId { raw: 42, shard: 1 };
}
