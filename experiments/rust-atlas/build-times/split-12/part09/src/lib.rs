//! Generated crate part09. Do not edit by hand, see generate.py.

pub mod m09;

pub fn part(seed: u64) -> u64 {
    let mut acc = seed;
    acc ^= m09::run(acc);
    acc
}
