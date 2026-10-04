//! Generated crate part05. Do not edit by hand, see generate.py.

pub mod m05;

pub fn part(seed: u64) -> u64 {
    let mut acc = seed;
    acc ^= m05::run(acc);
    acc
}
