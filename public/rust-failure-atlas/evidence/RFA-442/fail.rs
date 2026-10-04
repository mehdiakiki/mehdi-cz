enum Event { Move(i32, i32) }

fn main() {
    let event = Event::Move(3, 4);
    match event {
        Event::Move(x) => println!("{x}"),
    }
}
