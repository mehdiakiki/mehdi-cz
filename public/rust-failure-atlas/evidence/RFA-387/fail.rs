trait Left { type Item; }
trait Right { type Item; }
trait Both: Left + Right {
    fn accept(value: Self::Item);
}

fn main() {}
