unsafe extern "C" {
    fn rust_fn_returning_bool(flags: u8) -> bool;
}

fn main() {
    for flags in [0x00u8, 0x01, 0x10, 0x11] {
        let ret = unsafe { rust_fn_returning_bool(flags) };
        println!("flags=0x{flags:02x} ret={ret} as_u8={}", ret as u8);
    }
}
