unsafe trait TrustedBytes {}
struct Packet([u8; 4]);

// SAFETY: Packet contains exactly four initialized bytes and promises no other invariant.
unsafe impl TrustedBytes for Packet {}

fn accepts<T: TrustedBytes>(_value: T) {}

fn main() {
    accepts(Packet([1, 2, 3, 4]));
}
