//! Generated crate part00. Do not edit by hand, see generate.py.

pub mod m00;
pub mod m01;
pub mod m02;
pub mod m03;

pub fn part(seed: u64) -> u64 {
    let mut acc = seed;
    acc ^= m00::run(acc);
    acc ^= m01::run(acc);
    acc ^= m02::run(acc);
    acc ^= m03::run(acc);
    acc
}
