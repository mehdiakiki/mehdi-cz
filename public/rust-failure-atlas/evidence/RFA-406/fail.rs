fn main() {
    let direct = (f64::MAX + f64::MAX) / 2.0;
    let midpoint = f64::MAX.midpoint(f64::MAX);
    assert!(direct.is_infinite());
    assert!(midpoint.is_infinite(), "f64::midpoint avoids intermediate overflow when the mathematical midpoint is finite");
}
