//! Generated root. Do not edit by hand, see generate.py.

pub mod m00;
pub mod m01;
pub mod m02;
pub mod m03;
pub mod m04;
pub mod m05;
pub mod m06;
pub mod m07;
pub mod m08;
pub mod m09;
pub mod m10;
pub mod m11;

pub fn total(seed: u64) -> u64 {
    let mut acc = seed;
    acc ^= m00::run(acc);
    acc ^= m01::run(acc);
    acc ^= m02::run(acc);
    acc ^= m03::run(acc);
    acc ^= m04::run(acc);
    acc ^= m05::run(acc);
    acc ^= m06::run(acc);
    acc ^= m07::run(acc);
    acc ^= m08::run(acc);
    acc ^= m09::run(acc);
    acc ^= m10::run(acc);
    acc ^= m11::run(acc);
    acc
}
