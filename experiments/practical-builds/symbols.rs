#[no_mangle]
#[inline(never)]
pub fn retained_marker() {
    println!("marker={:#x}", retained_marker as usize);
    panic!("controlled symbol fixture A");
}

fn main() {
    retained_marker();
}
