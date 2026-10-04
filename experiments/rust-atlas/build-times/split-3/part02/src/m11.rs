//! Generated module 11. Do not edit by hand, see generate.py.

use shared::{transform, Op};

pub struct Op1100;
impl Op for Op1100 {
    const SALT: u64 = 11000034;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(11000034) ^ (x >> 3)
    }
}

pub struct Op1101;
impl Op for Op1101 {
    const SALT: u64 = 11007953;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(11007953) ^ (x >> 4)
    }
}

pub struct Op1102;
impl Op for Op1102 {
    const SALT: u64 = 11015872;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(11015872) ^ (x >> 5)
    }
}

pub struct Op1103;
impl Op for Op1103 {
    const SALT: u64 = 11023791;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(11023791) ^ (x >> 6)
    }
}

pub struct Op1104;
impl Op for Op1104 {
    const SALT: u64 = 11031710;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(11031710) ^ (x >> 7)
    }
}

pub struct Op1105;
impl Op for Op1105 {
    const SALT: u64 = 11039629;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(11039629) ^ (x >> 8)
    }
}

pub struct Op1106;
impl Op for Op1106 {
    const SALT: u64 = 11047548;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(11047548) ^ (x >> 9)
    }
}

pub struct Op1107;
impl Op for Op1107 {
    const SALT: u64 = 11055467;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(11055467) ^ (x >> 10)
    }
}

pub fn run(seed: u64) -> u64 {
    let mut acc = seed;
    acc = acc.wrapping_add(transform::<Op1100>(acc));
    acc = acc.wrapping_add(transform::<Op1101>(acc));
    acc = acc.wrapping_add(transform::<Op1102>(acc));
    acc = acc.wrapping_add(transform::<Op1103>(acc));
    acc = acc.wrapping_add(transform::<Op1104>(acc));
    acc = acc.wrapping_add(transform::<Op1105>(acc));
    acc = acc.wrapping_add(transform::<Op1106>(acc));
    acc = acc.wrapping_add(transform::<Op1107>(acc));
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
