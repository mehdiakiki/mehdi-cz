//! Generated crate part10. Do not edit by hand, see generate.py.

pub mod m10;

pub fn part(seed: u64) -> u64 {
    let mut acc = seed;
    acc ^= m10::run(acc);
    acc
}
