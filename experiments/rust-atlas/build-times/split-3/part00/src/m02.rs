//! Generated module 02. Do not edit by hand, see generate.py.

use shared::{transform, Op};

pub struct Op0200;
impl Op for Op0200 {
    const SALT: u64 = 2000007;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(2000007) ^ (x >> 3)
    }
}

pub struct Op0201;
impl Op for Op0201 {
    const SALT: u64 = 2007926;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(2007926) ^ (x >> 4)
    }
}

pub struct Op0202;
impl Op for Op0202 {
    const SALT: u64 = 2015845;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(2015845) ^ (x >> 5)
    }
}

pub struct Op0203;
impl Op for Op0203 {
    const SALT: u64 = 2023764;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(2023764) ^ (x >> 6)
    }
}

pub struct Op0204;
impl Op for Op0204 {
    const SALT: u64 = 2031683;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(2031683) ^ (x >> 7)
    }
}

pub struct Op0205;
impl Op for Op0205 {
    const SALT: u64 = 2039602;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(2039602) ^ (x >> 8)
    }
}

pub struct Op0206;
impl Op for Op0206 {
    const SALT: u64 = 2047521;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(2047521) ^ (x >> 9)
    }
}

pub struct Op0207;
impl Op for Op0207 {
    const SALT: u64 = 2055440;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(2055440) ^ (x >> 10)
    }
}

pub fn run(seed: u64) -> u64 {
    let mut acc = seed;
    acc = acc.wrapping_add(transform::<Op0200>(acc));
    acc = acc.wrapping_add(transform::<Op0201>(acc));
    acc = acc.wrapping_add(transform::<Op0202>(acc));
    acc = acc.wrapping_add(transform::<Op0203>(acc));
    acc = acc.wrapping_add(transform::<Op0204>(acc));
    acc = acc.wrapping_add(transform::<Op0205>(acc));
    acc = acc.wrapping_add(transform::<Op0206>(acc));
    acc = acc.wrapping_add(transform::<Op0207>(acc));
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
