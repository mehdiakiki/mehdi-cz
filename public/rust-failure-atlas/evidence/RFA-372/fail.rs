#[repr(u8)]
enum Stage {
    Waiting,
    Running = 0,
}

fn main() {
    let _ = Stage::Waiting;
}
