// Article 5: behavior without shape. Types that own no bytes and still
// decide which operations compile.
use std::alloc::{GlobalAlloc, Layout, System};
use std::marker::PhantomData;
use std::mem::size_of;
use std::sync::atomic::{AtomicUsize, Ordering};

struct Counting;
static ALLOCS: AtomicUsize = AtomicUsize::new(0);
unsafe impl GlobalAlloc for Counting {
    unsafe fn alloc(&self, l: Layout) -> *mut u8 { ALLOCS.fetch_add(1, Ordering::Relaxed); System.alloc(l) }
    unsafe fn dealloc(&self, p: *mut u8, l: Layout) { System.dealloc(p, l) }
}
#[global_allocator]
static A: Counting = Counting;

pub trait Stamp { fn stamp(&self, n: u64) -> u64; }

#[derive(Clone, Copy)]
pub struct Doubler;
impl Stamp for Doubler { fn stamp(&self, n: u64) -> u64 { n * 2 } }

#[no_mangle]
pub fn with_trait(n: u64) -> u64 { Doubler.stamp(n) }

#[no_mangle]
pub fn without_trait(n: u64) -> u64 { n * 2 }

// A typestate: the state is a type that owns no bytes.
pub struct Closed;
pub struct Open;
pub struct Door<State> { id: u32, _state: PhantomData<State> }

impl Door<Closed> {
    pub fn new(id: u32) -> Self { Door { id, _state: PhantomData } }
    pub fn open(self) -> Door<Open> { Door { id: self.id, _state: PhantomData } }
}
impl Door<Open> {
    pub fn walk_through(&self) -> u32 { self.id }
    pub fn close(self) -> Door<Closed> { Door { id: self.id, _state: PhantomData } }
}

fn main() {
    println!("size of Doubler:            {} bytes", size_of::<Doubler>());
    println!("size of Door<Closed>:       {} bytes", size_of::<Door<Closed>>());
    println!("size of Door<Open>:         {} bytes", size_of::<Door<Open>>());
    println!("size of u32:                {} bytes", size_of::<u32>());
    println!("size of &Doubler:           {} bytes", size_of::<&Doubler>());
    println!("size of &dyn Stamp:         {} bytes", size_of::<&dyn Stamp>());

    let before = ALLOCS.load(Ordering::Relaxed);
    let stamps: Vec<Doubler> = vec![Doubler; 1_000_000];
    let after = ALLOCS.load(Ordering::Relaxed);
    println!("a Vec of 1000000 Doublers:  len {}, allocations {}, size of the Vec value {} bytes",
        stamps.len(), after - before, size_of::<Vec<Doubler>>());
    println!("total: {}", stamps.iter().map(|s| s.stamp(1)).sum::<u64>());

    let door = Door::<Closed>::new(7);
    let door = door.open();
    println!("walked through door {}", door.walk_through());
    let _door = door.close();
    println!("with_trait(21) = {}, without_trait(21) = {}", with_trait(21), without_trait(21));
}
