trait Left {
    fn label(&self) -> &'static str { "left" }
}

trait Right {
    fn label(&self) -> &'static str { "right" }
}

struct Item;
impl Left for Item {}
impl Right for Item {}

fn main() {
    assert_eq!(Item.label(), "left");
}
