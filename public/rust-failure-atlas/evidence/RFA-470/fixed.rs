mod first { pub fn run() -> u8 { 1 } }
mod second { pub fn run() -> u8 { 2 } }

use first::run as run_first;
use second::run as run_second;

fn main() { assert_eq!((run_first(), run_second()), (1, 2)); }
