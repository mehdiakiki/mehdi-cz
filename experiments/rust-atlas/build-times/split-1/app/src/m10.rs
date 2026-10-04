//! Generated module 10. Do not edit by hand, see generate.py.

use shared::{transform, Op};

pub struct Op1000;
impl Op for Op1000 {
    const SALT: u64 = 10000031;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(10000031) ^ (x >> 3)
    }
}

pub struct Op1001;
impl Op for Op1001 {
    const SALT: u64 = 10007950;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(10007950) ^ (x >> 4)
    }
}

pub struct Op1002;
impl Op for Op1002 {
    const SALT: u64 = 10015869;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(10015869) ^ (x >> 5)
    }
}

pub struct Op1003;
impl Op for Op1003 {
    const SALT: u64 = 10023788;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(10023788) ^ (x >> 6)
    }
}

pub struct Op1004;
impl Op for Op1004 {
    const SALT: u64 = 10031707;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(10031707) ^ (x >> 7)
    }
}

pub struct Op1005;
impl Op for Op1005 {
    const SALT: u64 = 10039626;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(10039626) ^ (x >> 8)
    }
}

pub struct Op1006;
impl Op for Op1006 {
    const SALT: u64 = 10047545;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(10047545) ^ (x >> 9)
    }
}

pub struct Op1007;
impl Op for Op1007 {
    const SALT: u64 = 10055464;
    #[inline]
    fn step(x: u64) -> u64 {
        x.wrapping_mul(3).wrapping_add(10055464) ^ (x >> 10)
    }
}

pub fn run(seed: u64) -> u64 {
    let mut acc = seed;
    acc = acc.wrapping_add(transform::<Op1000>(acc));
    acc = acc.wrapping_add(transform::<Op1001>(acc));
    acc = acc.wrapping_add(transform::<Op1002>(acc));
    acc = acc.wrapping_add(transform::<Op1003>(acc));
    acc = acc.wrapping_add(transform::<Op1004>(acc));
    acc = acc.wrapping_add(transform::<Op1005>(acc));
    acc = acc.wrapping_add(transform::<Op1006>(acc));
    acc = acc.wrapping_add(transform::<Op1007>(acc));
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
