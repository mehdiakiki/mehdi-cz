//! Generated module 01. Do not edit by hand, see generate.py.

use shared::{transform, Op};

pub struct Op0100;
impl Op for Op0100 {
    const SALT: u64 = 1000004;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(1000004) ^ (x >> 3)
    }
}

pub struct Op0101;
impl Op for Op0101 {
    const SALT: u64 = 1007923;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(1007923) ^ (x >> 4)
    }
}

pub struct Op0102;
impl Op for Op0102 {
    const SALT: u64 = 1015842;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(1015842) ^ (x >> 5)
    }
}

pub struct Op0103;
impl Op for Op0103 {
    const SALT: u64 = 1023761;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(1023761) ^ (x >> 6)
    }
}

pub struct Op0104;
impl Op for Op0104 {
    const SALT: u64 = 1031680;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(1031680) ^ (x >> 7)
    }
}

pub struct Op0105;
impl Op for Op0105 {
    const SALT: u64 = 1039599;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(1039599) ^ (x >> 8)
    }
}

pub struct Op0106;
impl Op for Op0106 {
    const SALT: u64 = 1047518;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(1047518) ^ (x >> 9)
    }
}

pub struct Op0107;
impl Op for Op0107 {
    const SALT: u64 = 1055437;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(1055437) ^ (x >> 10)
    }
}

pub fn run(seed: u64) -> u64 {
    let mut acc = seed;
    acc = acc.wrapping_add(transform::<Op0100>(acc));
    acc = acc.wrapping_add(transform::<Op0101>(acc));
    acc = acc.wrapping_add(transform::<Op0102>(acc));
    acc = acc.wrapping_add(transform::<Op0103>(acc));
    acc = acc.wrapping_add(transform::<Op0104>(acc));
    acc = acc.wrapping_add(transform::<Op0105>(acc));
    acc = acc.wrapping_add(transform::<Op0106>(acc));
    acc = acc.wrapping_add(transform::<Op0107>(acc));
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
