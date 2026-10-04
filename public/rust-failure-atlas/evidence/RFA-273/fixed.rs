fn main() {
    let dividend = -7_i32;
    let divisor = 4_i32;
    let quotient = dividend.div_euclid(divisor);
    let remainder = dividend.rem_euclid(divisor);

    assert_eq!((quotient, remainder), (-2, 1));
    assert_eq!(dividend, quotient * divisor + remainder);
    assert!((0..divisor.abs()).contains(&remainder));
}
