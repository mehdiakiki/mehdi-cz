//! Generated crate part01. Do not edit by hand, see generate.py.

pub mod m04;
pub mod m05;
pub mod m06;
pub mod m07;

pub fn part(seed: u64) -> u64 {
    let mut acc = seed;
    acc ^= m04::run(acc);
    acc ^= m05::run(acc);
    acc ^= m06::run(acc);
    acc ^= m07::run(acc);
    acc
}
