use std::sync::atomic::{AtomicU8, Ordering};

fn main() {
    let mut bytes = [0_u8, 0];
    {
        let atomics = AtomicU8::from_mut_slice(&mut bytes);
        atomics[0].store(7, Ordering::Relaxed);
        atomics[1].store(9, Ordering::Relaxed);
    }

    assert_eq!(bytes, [7, 9]);
}
