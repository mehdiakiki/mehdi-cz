pub extern "C" fn callback() {
    panic!("panic escaped through a non-unwinding extern boundary");
}

fn main() {
    callback();
}
