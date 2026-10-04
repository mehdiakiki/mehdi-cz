//! Generated crate part00. Do not edit by hand, see generate.py.

pub mod m00;

pub fn part(seed: u64) -> u64 {
    let mut acc = seed;
    acc ^= m00::run(acc);
    acc
}
