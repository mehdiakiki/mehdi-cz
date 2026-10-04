mod primary {
    pub fn run() {}
}

mod fallback {
    pub fn run() {}
}

fn main() {
    primary::run();
    fallback::run();
}
