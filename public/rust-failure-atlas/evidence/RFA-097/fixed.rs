unsafe extern "C" {
    fn log_many(first: i32, ...);
}

fn main() {
    let _declaration_only: unsafe extern "C" fn(i32, ...) = log_many;
}
