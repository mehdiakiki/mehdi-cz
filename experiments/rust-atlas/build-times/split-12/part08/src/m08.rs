//! Generated module 08. Do not edit by hand, see generate.py.

use shared::{transform, Op};

pub struct Op0800;
impl Op for Op0800 {
    const SALT: u64 = 8000025;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(8000025) ^ (x >> 3)
    }
}

pub struct Op0801;
impl Op for Op0801 {
    const SALT: u64 = 8007944;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(8007944) ^ (x >> 4)
    }
}

pub struct Op0802;
impl Op for Op0802 {
    const SALT: u64 = 8015863;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(8015863) ^ (x >> 5)
    }
}

pub struct Op0803;
impl Op for Op0803 {
    const SALT: u64 = 8023782;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(8023782) ^ (x >> 6)
    }
}

pub struct Op0804;
impl Op for Op0804 {
    const SALT: u64 = 8031701;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(8031701) ^ (x >> 7)
    }
}

pub struct Op0805;
impl Op for Op0805 {
    const SALT: u64 = 8039620;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(8039620) ^ (x >> 8)
    }
}

pub struct Op0806;
impl Op for Op0806 {
    const SALT: u64 = 8047539;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(8047539) ^ (x >> 9)
    }
}

pub struct Op0807;
impl Op for Op0807 {
    const SALT: u64 = 8055458;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(8055458) ^ (x >> 10)
    }
}

pub fn run(seed: u64) -> u64 {
    let mut acc = seed;
    acc = acc.wrapping_add(transform::<Op0800>(acc));
    acc = acc.wrapping_add(transform::<Op0801>(acc));
    acc = acc.wrapping_add(transform::<Op0802>(acc));
    acc = acc.wrapping_add(transform::<Op0803>(acc));
    acc = acc.wrapping_add(transform::<Op0804>(acc));
    acc = acc.wrapping_add(transform::<Op0805>(acc));
    acc = acc.wrapping_add(transform::<Op0806>(acc));
    acc = acc.wrapping_add(transform::<Op0807>(acc));
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
