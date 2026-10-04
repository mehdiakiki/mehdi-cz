fn main() {
    let quotient = (-7_i32).div_euclid(4);
    assert_eq!(quotient, -7 / 4, "div_euclid does not use slash division's truncation-toward-zero rule for negative values");
}
