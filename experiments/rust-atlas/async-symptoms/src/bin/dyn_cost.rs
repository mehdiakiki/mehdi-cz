use std::alloc::{GlobalAlloc, Layout, System};
use std::future::Future;
use std::pin::Pin;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::Instant;

struct Counting;
static ALLOCS: AtomicUsize = AtomicUsize::new(0);
unsafe impl GlobalAlloc for Counting {
    unsafe fn alloc(&self, l: Layout) -> *mut u8 { ALLOCS.fetch_add(1, Ordering::Relaxed); System.alloc(l) }
    unsafe fn dealloc(&self, p: *mut u8, l: Layout) { System.dealloc(p, l) }
}
#[global_allocator]
static A: Counting = Counting;

// Static dispatch: native async fn in trait (stable since Rust 1.75).
trait Store {
    async fn get(&self, key: u64) -> u64;
}

// Dynamic dispatch: the manual boxed-future idiom that dyn requires.
trait DynStore {
    fn get<'a>(&'a self, key: u64) -> Pin<Box<dyn Future<Output = u64> + Send + 'a>>;
}

struct Memory { base: u64 }

impl Store for Memory {
    async fn get(&self, key: u64) -> u64 {
        if key % 64 == 0 { tokio::task::yield_now().await; }
        self.base.wrapping_add(key)
    }
}

impl DynStore for Memory {
    fn get<'a>(&'a self, key: u64) -> Pin<Box<dyn Future<Output = u64> + Send + 'a>> {
        Box::pin(async move {
            if key % 64 == 0 { tokio::task::yield_now().await; }
            self.base.wrapping_add(key)
        })
    }
}

async fn run_static<S: Store>(s: &S, n: u64) -> u64 {
    let mut acc = 0u64;
    for k in 0..n { acc = acc.wrapping_add(s.get(k).await); }
    acc
}

async fn run_dyn(s: &dyn DynStore, n: u64) -> u64 {
    let mut acc = 0u64;
    for k in 0..n { acc = acc.wrapping_add(s.get(k).await); }
    acc
}

fn main() {
    let rt = tokio::runtime::Builder::new_current_thread().enable_all().build().unwrap();
    let n = 1_000_000u64;
    let store = Memory { base: 3 };
    rt.block_on(async {
        // warm up
        run_static(&store, 10_000).await;
        run_dyn(&store, 10_000).await;

        let before = ALLOCS.load(Ordering::Relaxed);
        let t = Instant::now();
        let a = run_static(&store, n).await;
        let el = t.elapsed();
        let allocs = ALLOCS.load(Ordering::Relaxed) - before;
        println!("static  async fn in trait : {:>6.1} ns/call, {:>8} allocations for {n} calls (acc {a})", el.as_nanos() as f64 / n as f64, allocs);

        let before = ALLOCS.load(Ordering::Relaxed);
        let t = Instant::now();
        let b = run_dyn(&store, n).await;
        let el = t.elapsed();
        let allocs = ALLOCS.load(Ordering::Relaxed) - before;
        println!("dyn     Pin<Box<dyn Future>>: {:>6.1} ns/call, {:>8} allocations for {n} calls (acc {b})", el.as_nanos() as f64 / n as f64, allocs);

        println!("future size, static path: {} bytes", std::mem::size_of_val(&Store::get(&store, 1)));
        println!("future size, dyn path   : {} bytes on the heap, {} bytes handle",
            std::mem::size_of_val(&*DynStore::get(&store, 1)),
            std::mem::size_of_val(&DynStore::get(&store, 1)));
    });
}
