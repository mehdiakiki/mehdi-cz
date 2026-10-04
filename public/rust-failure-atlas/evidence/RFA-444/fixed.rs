struct Point { x: i32, y: i32 }

fn main() {
    let point = Point { x: 3, y: 4 };
    let Point { x, y: z } = point;
    assert_eq!((x, z), (3, 4));
}
