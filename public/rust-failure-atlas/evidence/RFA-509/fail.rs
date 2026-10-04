struct Envelope<T>(T);

fn main() {
    let _value: Envelope<u8, u16> = Envelope(7);
}
