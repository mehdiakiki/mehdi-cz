//! Generated root. Do not edit by hand, see generate.py.

use part00;
use part01;
use part02;

pub fn total(seed: u64) -> u64 {
    let mut acc = seed;
    acc ^= part00::part(acc);
    acc ^= part01::part(acc);
    acc ^= part02::part(acc);
    acc
}
