//! Generated module 07. Do not edit by hand, see generate.py.

use shared::{transform, Op};

pub struct Op0700;
impl Op for Op0700 {
    const SALT: u64 = 7000022;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(7000022) ^ (x >> 3)
    }
}

pub struct Op0701;
impl Op for Op0701 {
    const SALT: u64 = 7007941;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(7007941) ^ (x >> 4)
    }
}

pub struct Op0702;
impl Op for Op0702 {
    const SALT: u64 = 7015860;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(7015860) ^ (x >> 5)
    }
}

pub struct Op0703;
impl Op for Op0703 {
    const SALT: u64 = 7023779;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(7023779) ^ (x >> 6)
    }
}

pub struct Op0704;
impl Op for Op0704 {
    const SALT: u64 = 7031698;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(7031698) ^ (x >> 7)
    }
}

pub struct Op0705;
impl Op for Op0705 {
    const SALT: u64 = 7039617;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(7039617) ^ (x >> 8)
    }
}

pub struct Op0706;
impl Op for Op0706 {
    const SALT: u64 = 7047536;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(7047536) ^ (x >> 9)
    }
}

pub struct Op0707;
impl Op for Op0707 {
    const SALT: u64 = 7055455;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(7055455) ^ (x >> 10)
    }
}

pub fn run(seed: u64) -> u64 {
    let mut acc = seed;
    acc = acc.wrapping_add(transform::<Op0700>(acc));
    acc = acc.wrapping_add(transform::<Op0701>(acc));
    acc = acc.wrapping_add(transform::<Op0702>(acc));
    acc = acc.wrapping_add(transform::<Op0703>(acc));
    acc = acc.wrapping_add(transform::<Op0704>(acc));
    acc = acc.wrapping_add(transform::<Op0705>(acc));
    acc = acc.wrapping_add(transform::<Op0706>(acc));
    acc = acc.wrapping_add(transform::<Op0707>(acc));
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
