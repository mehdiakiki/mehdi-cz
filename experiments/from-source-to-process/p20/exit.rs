struct Guard(&'static str);

impl Drop for Guard {
    fn drop(&mut self) {
        eprintln!("drop of {}", self.0);
    }
}

fn main() {
    let mode = std::env::args().nth(1).unwrap_or_default();
    let _guard = Guard("the guard in main");
    print!("print! without a newline");
    match mode.as_str() {
        "exit" => std::process::exit(3),
        "abort" => std::process::abort(),
        _ => {}
    }
}
