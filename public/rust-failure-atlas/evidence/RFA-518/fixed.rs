type Shared<'a> = &'a (dyn Send + Sync);

fn main() {
    let value = 7_u8;
    let shared: Shared<'_> = &value;
    let _ = shared;
}
