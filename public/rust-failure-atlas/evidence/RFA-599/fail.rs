mod primary {
    pub fn run() {}
}

mod fallback {
    pub fn run() {}
}

mod dispatch {
    pub use crate::fallback::*;
    pub use crate::primary::*;
}

fn main() {
    dispatch::run();
}
