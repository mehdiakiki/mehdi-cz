#[repr(u8)]
enum Stage {
    Waiting = 0,
    Running = 1,
}

fn main() {
    assert_eq!(Stage::Waiting as u8, 0);
    assert_eq!(Stage::Running as u8, 1);
}
