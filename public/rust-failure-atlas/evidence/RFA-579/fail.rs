struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let point = Point { x: 3, y: 5 };
    println!("{}", point[0]);
}
