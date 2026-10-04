//! Generated crate part03. Do not edit by hand, see generate.py.

pub mod m03;

pub fn part(seed: u64) -> u64 {
    let mut acc = seed;
    acc ^= m03::run(acc);
    acc
}
