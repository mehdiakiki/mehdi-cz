trait Left { type Item; }
trait Right { type Item; }
trait Both: Left + Right {
    fn accept_left(value: <Self as Left>::Item);
    fn accept_right(value: <Self as Right>::Item);
}

struct Pair;
impl Left for Pair { type Item = u8; }
impl Right for Pair { type Item = String; }
impl Both for Pair {
    fn accept_left(value: u8) { assert_eq!(value, 7); }
    fn accept_right(value: String) { assert_eq!(value, "seven"); }
}

fn main() {
    Pair::accept_left(7);
    Pair::accept_right(String::from("seven"));
}
