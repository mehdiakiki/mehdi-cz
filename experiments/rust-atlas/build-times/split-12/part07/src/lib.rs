//! Generated crate part07. Do not edit by hand, see generate.py.

pub mod m07;

pub fn part(seed: u64) -> u64 {
    let mut acc = seed;
    acc ^= m07::run(acc);
    acc
}
