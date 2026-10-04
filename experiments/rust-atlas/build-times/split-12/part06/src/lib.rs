//! Generated crate part06. Do not edit by hand, see generate.py.

pub mod m06;

pub fn part(seed: u64) -> u64 {
    let mut acc = seed;
    acc ^= m06::run(acc);
    acc
}
