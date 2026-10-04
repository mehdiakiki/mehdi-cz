// Article 10: types as proofs. A newtype that costs nothing.
#[derive(Clone, Copy)] pub struct Meters(pub f64);
#[derive(Clone, Copy)] pub struct Seconds(pub f64);

#[no_mangle] pub fn add_plain(a: f64, b: f64) -> f64 { a + b }
#[no_mangle] pub fn add_meters(a: Meters, b: Meters) -> Meters { Meters(a.0 + b.0) }
#[no_mangle] pub fn speed(d: Meters, t: Seconds) -> f64 { d.0 / t.0 }

fn main() {
    use std::mem::size_of;
    println!("size of f64 {} / Meters {} / Seconds {}",
        size_of::<f64>(), size_of::<Meters>(), size_of::<Seconds>());
    let d = Meters(150.0);
    let t = Seconds(10.0);
    println!("speed: {} m/s", speed(d, t));

    // The checker refuses speed(t, d). But the proof only guards the source.
    // If the bits of a duration reach the first argument another way, the
    // division happens and nothing notices.
    let disguised: Meters = unsafe { std::mem::transmute(t) };
    let nonsense: Seconds = unsafe { std::mem::transmute(d) };
    println!("speed(disguised): {} and nothing complained", speed(disguised, nonsense));
}
