mod helpers { pub fn run() -> u8 { 2 } }

use helpers::run as run_helper;

fn run() -> u8 { 1 }

fn main() { assert_eq!((run(), run_helper()), (1, 2)); }
