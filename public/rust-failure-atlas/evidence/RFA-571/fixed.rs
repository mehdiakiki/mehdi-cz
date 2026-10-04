fn callback() {}

fn main() {
    let pointer: fn() = callback;
    pointer();
}
