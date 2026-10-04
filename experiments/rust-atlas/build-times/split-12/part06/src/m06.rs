//! Generated module 06. Do not edit by hand, see generate.py.

use shared::{transform, Op};

pub struct Op0600;
impl Op for Op0600 {
    const SALT: u64 = 6000019;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(6000019) ^ (x >> 3)
    }
}

pub struct Op0601;
impl Op for Op0601 {
    const SALT: u64 = 6007938;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(6007938) ^ (x >> 4)
    }
}

pub struct Op0602;
impl Op for Op0602 {
    const SALT: u64 = 6015857;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(6015857) ^ (x >> 5)
    }
}

pub struct Op0603;
impl Op for Op0603 {
    const SALT: u64 = 6023776;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(6023776) ^ (x >> 6)
    }
}

pub struct Op0604;
impl Op for Op0604 {
    const SALT: u64 = 6031695;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(6031695) ^ (x >> 7)
    }
}

pub struct Op0605;
impl Op for Op0605 {
    const SALT: u64 = 6039614;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(6039614) ^ (x >> 8)
    }
}

pub struct Op0606;
impl Op for Op0606 {
    const SALT: u64 = 6047533;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(6047533) ^ (x >> 9)
    }
}

pub struct Op0607;
impl Op for Op0607 {
    const SALT: u64 = 6055452;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(6055452) ^ (x >> 10)
    }
}

pub fn run(seed: u64) -> u64 {
    let mut acc = seed;
    acc = acc.wrapping_add(transform::<Op0600>(acc));
    acc = acc.wrapping_add(transform::<Op0601>(acc));
    acc = acc.wrapping_add(transform::<Op0602>(acc));
    acc = acc.wrapping_add(transform::<Op0603>(acc));
    acc = acc.wrapping_add(transform::<Op0604>(acc));
    acc = acc.wrapping_add(transform::<Op0605>(acc));
    acc = acc.wrapping_add(transform::<Op0606>(acc));
    acc = acc.wrapping_add(transform::<Op0607>(acc));
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
