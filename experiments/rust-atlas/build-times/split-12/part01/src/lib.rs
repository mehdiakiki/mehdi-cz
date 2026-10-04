//! Generated crate part01. Do not edit by hand, see generate.py.

pub mod m01;

pub fn part(seed: u64) -> u64 {
    let mut acc = seed;
    acc ^= m01::run(acc);
    acc
}
