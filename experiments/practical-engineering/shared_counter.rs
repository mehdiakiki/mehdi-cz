use std::hint::black_box;
use std::sync::atomic::{AtomicU64, Ordering};
use std::thread;

fn shared_count(workers: usize, each: u64) -> u64 {
    let total = AtomicU64::new(0);
    thread::scope(|scope| {
        for _ in 0..workers {
            let total = &total;
            scope.spawn(move || {
                for _ in 0..each {
                    total.fetch_add(1, Ordering::Relaxed);
                }
            });
        }
    });
    total.load(Ordering::Relaxed)
}

fn reduced_count(workers: usize, each: u64) -> u64 {
    thread::scope(|scope| {
        let mut handles = Vec::new();
        for _ in 0..workers {
            handles.push(scope.spawn(move || {
                let mut local = 0_u64;
                for _ in 0..each {
                    local += black_box(1_u64);
                }
                local
            }));
        }
        handles
            .into_iter()
            .map(|handle| handle.join().unwrap())
            .sum()
    })
}

fn main() {
    let total = 10_000_u64;
    for workers in [1_usize, 2, 4, 8] {
        let each = total / workers as u64;
        assert_eq!(shared_count(workers, each), total);
        assert_eq!(reduced_count(workers, each), total);
    }
    assert_eq!(shared_count(4, 0), 0);
    assert_eq!(reduced_count(4, 0), 0);
    println!("Equal totals verified; no timing or speedup measured.");
}
