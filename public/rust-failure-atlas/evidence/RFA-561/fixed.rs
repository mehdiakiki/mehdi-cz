#[repr(u16)]
enum Status {
    Ready = 1,
    Failed = 2,
}

fn main() {
    assert_eq!(Status::Ready as u16, 1);
    assert_eq!(Status::Failed as u16, 2);
}
