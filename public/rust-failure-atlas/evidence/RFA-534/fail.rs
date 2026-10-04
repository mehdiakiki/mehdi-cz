use std::ops::Add;

#[derive(Debug, PartialEq)]
struct Credits(u32);

impl Add for Credits {
    type Output = Credits;

    fn add(self, other: Credits) -> Credits {
        Credits(self.0 + other.0)
    }
}

fn main() {
    let mut total = Credits(4);
    total += Credits(3);
    assert_eq!(total, Credits(7));
}
