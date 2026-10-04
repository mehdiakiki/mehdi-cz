#![deny(unsafe_code)]

#[unsafe(link_section = ".rfa_registry")]
static REGISTRATION: [u8; 1] = [0];

fn main() {
    println!("{}", REGISTRATION[0]);
}
