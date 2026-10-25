use std::cell::{Cell, RefCell};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Barrier};

static START_CALLS: AtomicUsize = AtomicUsize::new(0);
static DROP_CALLS: AtomicUsize = AtomicUsize::new(0);

struct Noisy(u64);

impl Drop for Noisy {
    fn drop(&mut self) {
        DROP_CALLS.fetch_add(1, Ordering::Relaxed);
    }
}

fn start_value() -> u64 {
    START_CALLS.fetch_add(1, Ordering::Relaxed);
    100
}

thread_local! {
    static PLAIN: Cell<u64> = const { Cell::new(0) };
    static LAZY: Cell<u64> = Cell::new(start_value());
    static NOISY: RefCell<Noisy> = RefCell::new(Noisy(0));
}

#[inline(never)]
pub fn bump_plain() -> u64 {
    PLAIN.with(|c| {
        let v = c.get() + 1;
        c.set(v);
        v
    })
}

#[inline(never)]
pub fn bump_lazy() -> u64 {
    LAZY.with(|c| {
        let v = c.get() + 1;
        c.set(v);
        v
    })
}

#[inline(never)]
pub fn bump_noisy() -> u64 {
    NOISY.with(|n| {
        let mut n = n.borrow_mut();
        n.0 += 1;
        n.0
    })
}

fn main() {
    let barrier = Arc::new(Barrier::new(2));
    let handles: Vec<_> = (1..=2u64)
        .map(|id| {
            let barrier = Arc::clone(&barrier);
            std::thread::spawn(move || {
                for _ in 0..id {
                    bump_plain();
                    bump_lazy();
                    bump_noisy();
                }
                let address = PLAIN.with(|c| c as *const Cell<u64> as usize);
                let line = format!(
                    "thread {id}: PLAIN = {} at {address:#x}, LAZY = {}, NOISY = {}",
                    PLAIN.with(Cell::get),
                    LAZY.with(Cell::get),
                    NOISY.with(|n| n.borrow().0)
                );
                barrier.wait();
                line
            })
        })
        .collect();
    for handle in handles {
        println!("{}", handle.join().unwrap());
    }
    let address = PLAIN.with(|c| c as *const Cell<u64> as usize);
    println!("main:     PLAIN = {} at {address:#x}", PLAIN.with(Cell::get));
    println!(
        "start_value() ran {} times, Noisy was dropped {} times",
        START_CALLS.load(Ordering::Relaxed),
        DROP_CALLS.load(Ordering::Relaxed)
    );
}
