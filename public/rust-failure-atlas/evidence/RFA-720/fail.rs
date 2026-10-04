#![deny(suspicious_runtime_symbol_definitions)]

#[unsafe(no_mangle)]
pub extern "C" fn strlen(_: *mut f32) -> usize {
    0
}

fn main() {}
