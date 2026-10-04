//! Generated module 04. Do not edit by hand, see generate.py.

use shared::{transform, Op};

pub struct Op0400;
impl Op for Op0400 {
    const SALT: u64 = 4000013;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(4000013) ^ (x >> 3)
    }
}

pub struct Op0401;
impl Op for Op0401 {
    const SALT: u64 = 4007932;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(4007932) ^ (x >> 4)
    }
}

pub struct Op0402;
impl Op for Op0402 {
    const SALT: u64 = 4015851;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(4015851) ^ (x >> 5)
    }
}

pub struct Op0403;
impl Op for Op0403 {
    const SALT: u64 = 4023770;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(4023770) ^ (x >> 6)
    }
}

pub struct Op0404;
impl Op for Op0404 {
    const SALT: u64 = 4031689;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(4031689) ^ (x >> 7)
    }
}

pub struct Op0405;
impl Op for Op0405 {
    const SALT: u64 = 4039608;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(4039608) ^ (x >> 8)
    }
}

pub struct Op0406;
impl Op for Op0406 {
    const SALT: u64 = 4047527;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(4047527) ^ (x >> 9)
    }
}

pub struct Op0407;
impl Op for Op0407 {
    const SALT: u64 = 4055446;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(4055446) ^ (x >> 10)
    }
}

pub fn run(seed: u64) -> u64 {
    let mut acc = seed;
    acc = acc.wrapping_add(transform::<Op0400>(acc));
    acc = acc.wrapping_add(transform::<Op0401>(acc));
    acc = acc.wrapping_add(transform::<Op0402>(acc));
    acc = acc.wrapping_add(transform::<Op0403>(acc));
    acc = acc.wrapping_add(transform::<Op0404>(acc));
    acc = acc.wrapping_add(transform::<Op0405>(acc));
    acc = acc.wrapping_add(transform::<Op0406>(acc));
    acc = acc.wrapping_add(transform::<Op0407>(acc));
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
