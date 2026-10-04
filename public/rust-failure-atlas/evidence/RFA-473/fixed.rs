extern crate core;
extern crate std as standard;

fn main() {
    let _ = core::mem::size_of::<u8>();
    standard::println!("ready");
}
