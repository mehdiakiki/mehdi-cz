// Article 4: the same fields are not the same type. This file must not compile.
pub struct Point { pub x: f64, pub y: f64 }
pub struct Vector { pub x: f64, pub y: f64 }
fn vector_norm(v: Vector) -> f64 { (v.x * v.x + v.y * v.y).sqrt() }
fn main() {
    let p = Point { x: 3.0, y: 4.0 };
    println!("{}", vector_norm(p));
}
