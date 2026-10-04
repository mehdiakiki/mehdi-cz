struct Point { x: i32, y: i32 }

fn main() {
    let point = Point { x: 3, y: 4 };
    let Point { x: horizontal, x: vertical } = point;
    println!("{horizontal} {vertical}");
}
