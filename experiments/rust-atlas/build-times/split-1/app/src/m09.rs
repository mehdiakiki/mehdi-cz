//! Generated module 09. Do not edit by hand, see generate.py.

use shared::{transform, Op};

pub struct Op0900;
impl Op for Op0900 {
    const SALT: u64 = 9000028;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(9000028) ^ (x >> 3)
    }
}

pub struct Op0901;
impl Op for Op0901 {
    const SALT: u64 = 9007947;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(9007947) ^ (x >> 4)
    }
}

pub struct Op0902;
impl Op for Op0902 {
    const SALT: u64 = 9015866;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(9015866) ^ (x >> 5)
    }
}

pub struct Op0903;
impl Op for Op0903 {
    const SALT: u64 = 9023785;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(9023785) ^ (x >> 6)
    }
}

pub struct Op0904;
impl Op for Op0904 {
    const SALT: u64 = 9031704;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(9031704) ^ (x >> 7)
    }
}

pub struct Op0905;
impl Op for Op0905 {
    const SALT: u64 = 9039623;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(9039623) ^ (x >> 8)
    }
}

pub struct Op0906;
impl Op for Op0906 {
    const SALT: u64 = 9047542;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(9047542) ^ (x >> 9)
    }
}

pub struct Op0907;
impl Op for Op0907 {
    const SALT: u64 = 9055461;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(9055461) ^ (x >> 10)
    }
}

pub fn run(seed: u64) -> u64 {
    let mut acc = seed;
    acc = acc.wrapping_add(transform::<Op0900>(acc));
    acc = acc.wrapping_add(transform::<Op0901>(acc));
    acc = acc.wrapping_add(transform::<Op0902>(acc));
    acc = acc.wrapping_add(transform::<Op0903>(acc));
    acc = acc.wrapping_add(transform::<Op0904>(acc));
    acc = acc.wrapping_add(transform::<Op0905>(acc));
    acc = acc.wrapping_add(transform::<Op0906>(acc));
    acc = acc.wrapping_add(transform::<Op0907>(acc));
    acc = acc.wrapping_add(transform::<shared::C00>(acc));
    acc = acc.wrapping_add(transform::<shared::C01>(acc));
    acc = acc.wrapping_add(transform::<shared::C02>(acc));
    acc = acc.wrapping_add(transform::<shared::C03>(acc));
    acc = acc.wrapping_add(transform::<shared::C04>(acc));
    acc = acc.wrapping_add(transform::<shared::C05>(acc));
    acc = acc.wrapping_add(transform::<shared::C06>(acc));
    acc = acc.wrapping_add(transform::<shared::C07>(acc));
    acc = acc.wrapping_add(transform::<shared::C08>(acc));
    acc = acc.wrapping_add(transform::<shared::C09>(acc));
    acc = acc.wrapping_add(transform::<shared::C10>(acc));
    acc = acc.wrapping_add(transform::<shared::C11>(acc));
    acc = acc.wrapping_add(transform::<shared::C12>(acc));
    acc = acc.wrapping_add(transform::<shared::C13>(acc));
    acc = acc.wrapping_add(transform::<shared::C14>(acc));
    acc = acc.wrapping_add(transform::<shared::C15>(acc));
    acc
}
