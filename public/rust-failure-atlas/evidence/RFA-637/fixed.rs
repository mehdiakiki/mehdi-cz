union Number {
    integer: u32,
    float: f32,
}

fn main() {
    let number = Number { integer: 7 };
    assert_eq!(unsafe { number.integer }, 7);
}
