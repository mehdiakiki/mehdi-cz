//! Generated module 03. Do not edit by hand, see generate.py.

use shared::{transform, Op};

pub struct Op0300;
impl Op for Op0300 {
    const SALT: u64 = 3000010;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(3000010) ^ (x >> 3)
    }
}

pub struct Op0301;
impl Op for Op0301 {
    const SALT: u64 = 3007929;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(3007929) ^ (x >> 4)
    }
}

pub struct Op0302;
impl Op for Op0302 {
    const SALT: u64 = 3015848;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(3015848) ^ (x >> 5)
    }
}

pub struct Op0303;
impl Op for Op0303 {
    const SALT: u64 = 3023767;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(3023767) ^ (x >> 6)
    }
}

pub struct Op0304;
impl Op for Op0304 {
    const SALT: u64 = 3031686;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(3031686) ^ (x >> 7)
    }
}

pub struct Op0305;
impl Op for Op0305 {
    const SALT: u64 = 3039605;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(3039605) ^ (x >> 8)
    }
}

pub struct Op0306;
impl Op for Op0306 {
    const SALT: u64 = 3047524;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(3047524) ^ (x >> 9)
    }
}

pub struct Op0307;
impl Op for Op0307 {
    const SALT: u64 = 3055443;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(3055443) ^ (x >> 10)
    }
}

pub fn run(seed: u64) -> u64 {
    let mut acc = seed;
    acc = acc.wrapping_add(transform::<Op0300>(acc));
    acc = acc.wrapping_add(transform::<Op0301>(acc));
    acc = acc.wrapping_add(transform::<Op0302>(acc));
    acc = acc.wrapping_add(transform::<Op0303>(acc));
    acc = acc.wrapping_add(transform::<Op0304>(acc));
    acc = acc.wrapping_add(transform::<Op0305>(acc));
    acc = acc.wrapping_add(transform::<Op0306>(acc));
    acc = acc.wrapping_add(transform::<Op0307>(acc));
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
