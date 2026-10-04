fn main() {
    let fraction = (-3.6_f64).fract();
    assert!(fraction >= 0.0, "f64::fract keeps the sign produced by subtracting trunc(), so negative inputs have negative fractional parts");
}
