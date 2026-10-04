//! Generated root. Do not edit by hand, see generate.py.

use part00;
use part01;
use part02;
use part03;
use part04;
use part05;
use part06;
use part07;
use part08;
use part09;
use part10;
use part11;

pub fn total(seed: u64) -> u64 {
    let mut acc = seed;
    acc ^= part00::part(acc);
    acc ^= part01::part(acc);
    acc ^= part02::part(acc);
    acc ^= part03::part(acc);
    acc ^= part04::part(acc);
    acc ^= part05::part(acc);
    acc ^= part06::part(acc);
    acc ^= part07::part(acc);
    acc ^= part08::part(acc);
    acc ^= part09::part(acc);
    acc ^= part10::part(acc);
    acc ^= part11::part(acc);
    acc
}
