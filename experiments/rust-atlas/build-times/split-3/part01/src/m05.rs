//! Generated module 05. Do not edit by hand, see generate.py.

use shared::{transform, Op};

pub struct Op0500;
impl Op for Op0500 {
    const SALT: u64 = 5000016;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(5000016) ^ (x >> 3)
    }
}

pub struct Op0501;
impl Op for Op0501 {
    const SALT: u64 = 5007935;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(5007935) ^ (x >> 4)
    }
}

pub struct Op0502;
impl Op for Op0502 {
    const SALT: u64 = 5015854;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(5015854) ^ (x >> 5)
    }
}

pub struct Op0503;
impl Op for Op0503 {
    const SALT: u64 = 5023773;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(5023773) ^ (x >> 6)
    }
}

pub struct Op0504;
impl Op for Op0504 {
    const SALT: u64 = 5031692;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(5031692) ^ (x >> 7)
    }
}

pub struct Op0505;
impl Op for Op0505 {
    const SALT: u64 = 5039611;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(5039611) ^ (x >> 8)
    }
}

pub struct Op0506;
impl Op for Op0506 {
    const SALT: u64 = 5047530;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(5047530) ^ (x >> 9)
    }
}

pub struct Op0507;
impl Op for Op0507 {
    const SALT: u64 = 5055449;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(5055449) ^ (x >> 10)
    }
}

pub fn run(seed: u64) -> u64 {
    let mut acc = seed;
    acc = acc.wrapping_add(transform::<Op0500>(acc));
    acc = acc.wrapping_add(transform::<Op0501>(acc));
    acc = acc.wrapping_add(transform::<Op0502>(acc));
    acc = acc.wrapping_add(transform::<Op0503>(acc));
    acc = acc.wrapping_add(transform::<Op0504>(acc));
    acc = acc.wrapping_add(transform::<Op0505>(acc));
    acc = acc.wrapping_add(transform::<Op0506>(acc));
    acc = acc.wrapping_add(transform::<Op0507>(acc));
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
