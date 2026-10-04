trait Translate {
    fn translate(pair: (i32, i32)) -> i32;
}

struct Sum;

impl Translate for Sum {
    fn translate((left, right): (i32, i32)) -> i32 {
        left + right
    }
}

fn main() {
    assert_eq!(Sum::translate((2, 3)), 5);
}
