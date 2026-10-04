// Safety: this crate owns the exported symbol name and defines it exactly once.
#[unsafe(no_mangle)]
pub extern "C" fn atlas_status() -> i32 {
    1
}

fn main() {
    assert_eq!(atlas_status(), 1);
}
