trait Contains<T> {}
trait Token {}

fn accept<T: Token>(_value: impl Contains<T>) {}

struct Word;
struct Packet;
impl Token for Word {}
impl Contains<Word> for Packet {}

fn main() {
    accept::<Word>(Packet);
}
