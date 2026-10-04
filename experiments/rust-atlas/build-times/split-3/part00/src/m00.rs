//! Generated module 00. Do not edit by hand, see generate.py.

use shared::{transform, Op};

pub struct Op0000;
impl Op for Op0000 {
    const SALT: u64 = 1;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(1) ^ (x >> 3)
    }
}

pub struct Op0001;
impl Op for Op0001 {
    const SALT: u64 = 7920;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(7920) ^ (x >> 4)
    }
}

pub struct Op0002;
impl Op for Op0002 {
    const SALT: u64 = 15839;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(15839) ^ (x >> 5)
    }
}

pub struct Op0003;
impl Op for Op0003 {
    const SALT: u64 = 23758;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(23758) ^ (x >> 6)
    }
}

pub struct Op0004;
impl Op for Op0004 {
    const SALT: u64 = 31677;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(31677) ^ (x >> 7)
    }
}

pub struct Op0005;
impl Op for Op0005 {
    const SALT: u64 = 39596;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(39596) ^ (x >> 8)
    }
}

pub struct Op0006;
impl Op for Op0006 {
    const SALT: u64 = 47515;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(47515) ^ (x >> 9)
    }
}

pub struct Op0007;
impl Op for Op0007 {
    const SALT: u64 = 55434;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(55434) ^ (x >> 10)
    }
}

pub fn run(seed: u64) -> u64 {
    let mut acc = seed;
    acc = acc.wrapping_add(transform::<Op0000>(acc));
    acc = acc.wrapping_add(transform::<Op0001>(acc));
    acc = acc.wrapping_add(transform::<Op0002>(acc));
    acc = acc.wrapping_add(transform::<Op0003>(acc));
    acc = acc.wrapping_add(transform::<Op0004>(acc));
    acc = acc.wrapping_add(transform::<Op0005>(acc));
    acc = acc.wrapping_add(transform::<Op0006>(acc));
    acc = acc.wrapping_add(transform::<Op0007>(acc));
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
