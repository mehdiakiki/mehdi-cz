// Article 10: the proof the checker refuses. This file must not compile.
#[derive(Clone, Copy)] pub struct Meters(pub f64);
#[derive(Clone, Copy)] pub struct Seconds(pub f64);
fn main() {
    let d = Meters(150.0);
    let t = Seconds(10.0);
    let _ = d.0 + t.0;
    let _nonsense = d + t;
}
