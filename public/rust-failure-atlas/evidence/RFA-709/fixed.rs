#![deny(unsafe_code)]

#[used]
static REGISTRATION: [u8; 1] = [0];

fn main() {
    println!("{}", REGISTRATION[0]);
}
