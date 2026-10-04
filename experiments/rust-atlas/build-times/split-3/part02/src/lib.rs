//! Generated crate part02. Do not edit by hand, see generate.py.

pub mod m08;
pub mod m09;
pub mod m10;
pub mod m11;

pub fn part(seed: u64) -> u64 {
    let mut acc = seed;
    acc ^= m08::run(acc);
    acc ^= m09::run(acc);
    acc ^= m10::run(acc);
    acc ^= m11::run(acc);
    acc
}
