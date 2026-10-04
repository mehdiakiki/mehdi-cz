use std::mem::transmute;

fn callback() {}

fn main() {
    let _pointer: fn() = unsafe { transmute(callback) };
}
