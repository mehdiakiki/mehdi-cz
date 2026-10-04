struct Point { x: i32, y: i32 }

fn main() {
    let point = Point { x: 3, y: 4 };
    let Point { x, z } = point;
    println!("{x} {z}");
}
