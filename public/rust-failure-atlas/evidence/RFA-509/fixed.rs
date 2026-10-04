struct Envelope<T>(T);

fn main() {
    let value: Envelope<u8> = Envelope(7);
    assert_eq!(value.0, 7);
}
