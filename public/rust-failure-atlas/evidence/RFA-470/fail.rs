mod first { pub fn run() {} }
mod second { pub fn run() {} }

use first::run;
use second::run;

fn main() { run(); }
