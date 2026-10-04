//! Generated crate part04. Do not edit by hand, see generate.py.

pub mod m04;

pub fn part(seed: u64) -> u64 {
    let mut acc = seed;
    acc ^= m04::run(acc);
    acc
}
