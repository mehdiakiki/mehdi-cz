//! Generated crate part08. Do not edit by hand, see generate.py.

pub mod m08;

pub fn part(seed: u64) -> u64 {
    let mut acc = seed;
    acc ^= m08::run(acc);
    acc
}
