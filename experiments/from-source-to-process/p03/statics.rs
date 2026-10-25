use std::sync::atomic::{AtomicU32, Ordering};

static COUNTER: AtomicU32 = AtomicU32::new(42);
static ZEROED: AtomicU32 = AtomicU32::new(0);
static LIMIT: u32 = 100;
static GREETING: &str = "hello from a static";
static mut RAW: u32 = 3;
const MAX: u32 = 7;

unsafe extern "C" {
    static __executable_start: u8;
}

fn show(name: &str, p: *const u8) {
    let base = &raw const __executable_start;
    println!("{name:24} {p:14p}  offset {:#x}", p as usize - base as usize);
}

fn main() {
    COUNTER.fetch_add(1, Ordering::Relaxed);
    ZEROED.fetch_add(1, Ordering::Relaxed);
    show("COUNTER (AtomicU32 42)", (&raw const COUNTER).cast());
    show("ZEROED (AtomicU32 0)", (&raw const ZEROED).cast());
    show("LIMIT (u32 100)", (&raw const LIMIT).cast());
    show("GREETING (the &str)", (&raw const GREETING).cast());
    show("GREETING (the bytes)", GREETING.as_ptr());
    show("RAW (static mut)", (&raw const RAW).cast());
    println!("MAX = {}", std::hint::black_box(MAX));
}
