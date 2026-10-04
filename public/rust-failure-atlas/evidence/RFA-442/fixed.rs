enum Event { Move(i32, i32) }

fn main() {
    let event = Event::Move(3, 4);
    let Event::Move(x, y) = event;
    assert_eq!((x, y), (3, 4));
}
