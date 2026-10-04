//! Generated crate part02. Do not edit by hand, see generate.py.

pub mod m02;

pub fn part(seed: u64) -> u64 {
    let mut acc = seed;
    acc ^= m02::run(acc);
    acc
}
