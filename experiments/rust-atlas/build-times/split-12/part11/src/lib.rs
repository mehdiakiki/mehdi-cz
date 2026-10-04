//! Generated crate part11. Do not edit by hand, see generate.py.

pub mod m11;

pub fn part(seed: u64) -> u64 {
    let mut acc = seed;
    acc ^= m11::run(acc);
    acc
}
