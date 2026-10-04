// Safety: the embedding application must provide this exact C ABI signature.
unsafe extern "C" {
    fn atlas_foreign_status() -> i32;
}

fn main() {
    let _declaration_only: unsafe extern "C" fn() -> i32 = atlas_foreign_status;
}
