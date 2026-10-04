// Article 4: two structs with the same fields.
#[derive(Clone, Copy)]
pub struct Point { pub x: f64, pub y: f64 }
#[derive(Clone, Copy)]
pub struct Vector { pub x: f64, pub y: f64 }

#[no_mangle]
pub fn point_norm(p: Point) -> f64 { (p.x * p.x + p.y * p.y).sqrt() }

#[no_mangle]
pub fn vector_norm(v: Vector) -> f64 { (v.x * v.x + v.y * v.y).sqrt() }

impl Vector {
    pub fn scale(self, k: f64) -> Vector { Vector { x: self.x * k, y: self.y * k } }
}

fn main() {
    use std::mem::{offset_of, size_of};
    println!("size: Point {} bytes, Vector {} bytes", size_of::<Point>(), size_of::<Vector>());
    println!("offsets: Point.x {} Point.y {}, Vector.x {} Vector.y {}",
        offset_of!(Point, x), offset_of!(Point, y), offset_of!(Vector, x), offset_of!(Vector, y));
    assert_eq!((size_of::<Point>(), offset_of!(Point, x), offset_of!(Point, y)),
               (size_of::<Vector>(), offset_of!(Vector, x), offset_of!(Vector, y)));
    let p = Point { x: 3.0, y: 4.0 };
    // -> sound only because the assert above passed on this build
    let v: Vector = unsafe { std::mem::transmute(p) };
    println!("transmute(Point 3,4) as Vector: x={} y={} norm={}", v.x, v.y, vector_norm(v));
    println!("scaled: {:?}", { let s = v.scale(2.0); (s.x, s.y) });
}
