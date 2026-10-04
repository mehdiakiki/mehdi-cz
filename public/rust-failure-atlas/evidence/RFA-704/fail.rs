use std::sync::atomic::{AtomicU8, Ordering};

fn main() {
    let mut bytes = [0_u8, 0];
    let atomics = AtomicU8::from_mut_slice(&mut bytes);

    bytes[0] = 7;
    atomics[1].store(9, Ordering::Relaxed);
}
