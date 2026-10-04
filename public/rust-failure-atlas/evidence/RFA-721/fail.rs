use std::num::NonZeroU32;

fn main() {
    let workers = NonZeroU32::from_str_radix("0", 10).unwrap();
    println!("worker count: {workers}");
}
