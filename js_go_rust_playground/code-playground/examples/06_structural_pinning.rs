// ============================================================
// Example 6: Structural Pinning
// ============================================================
// When you have Pin<&mut Struct>, how do you access fields?
// 
// The answer depends on whether the field needs to stay pinned:
//   - Pinned field (#[pin]): you get Pin<&mut Field>
//   - Unpinned field: you get &mut Field directly
//
// In real code, use the `pin-project` crate to generate these
// projections safely. Here we do it manually to show the mechanics.
// ============================================================

use std::future::Future;
use std::marker::PhantomPinned;
use std::pin::Pin;
use std::task::{Context, Poll, RawWaker, RawWakerVTable, Waker};

/// A struct with two fields:
///   - `label`: does NOT need pinning (just a String, Unpin)
///   - `inner`: DOES need pinning (it is a future, !Unpin)
struct LabeledFuture<F> {
    label: String,      // unpinned: safe to move, we get &mut String
    inner: F,           // pinned: must stay put, we get Pin<&mut F>
    _pin: PhantomPinned,
}

// Manual pin projection — this is what pin-project generates for you.
// In real code, you would write:
//   #[pin_project]
//   struct LabeledFuture<F> {
//       label: String,
//       #[pin] inner: F,
//   }
// and get these methods automatically.
impl<F: Future> LabeledFuture<F> {
    /// Project to the unpinned field: returns &mut String.
    /// Safe because String is Unpin — moving it cannot cause harm.
    fn label(self: Pin<&mut Self>) -> &mut String {
        // Safety: `label` is not structurally pinned.
        unsafe { &mut self.get_unchecked_mut().label }
    }

    /// Project to the pinned field: returns Pin<&mut F>.
    /// Unsafe because we must guarantee F stays pinned.
    fn inner(self: Pin<&mut Self>) -> Pin<&mut F> {
        // Safety: `inner` is structurally pinned — we never move it,
        // and dropping LabeledFuture does not move inner.
        unsafe { self.map_unchecked_mut(|s| &mut s.inner) }
    }
}

// A simple future for demonstration.
struct CountTo {
    current: u32,
    target: u32,
}

impl Future for CountTo {
    type Output = u32;

    fn poll(mut self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<u32> {
        self.current += 1;
        if self.current >= self.target {
            Poll::Ready(self.current)
        } else {
            Poll::Pending
        }
    }
}

fn dummy_waker() -> Waker {
    fn no_op(_: *const ()) {}
    fn clone(p: *const ()) -> RawWaker { RawWaker::new(p, &VTABLE) }
    static VTABLE: RawWakerVTable = RawWakerVTable::new(clone, no_op, no_op, no_op);
    unsafe { Waker::from_raw(RawWaker::new(std::ptr::null(), &VTABLE)) }
}

fn main() {
    let labeled = LabeledFuture {
        label: String::from("my-counter"),
        inner: CountTo { current: 0, target: 3 },
        _pin: PhantomPinned,
    };

    // Pin the whole struct on the heap.
    let mut pinned = Box::pin(labeled);
    let waker = dummy_waker();
    let mut cx = Context::from_waker(&waker);

    println!("=== Structural Pinning Demo ===");
    println!();

    // Access the unpinned field — we get &mut String.
    *pinned.as_mut().label() = String::from("renamed-counter");
    println!("Renamed label to: {:?}", &pinned.label);

    // Poll the pinned field — we get Pin<&mut CountTo>.
    loop {
        let label = pinned.label.clone();
        match pinned.as_mut().inner().poll(&mut cx) {
            Poll::Pending => println!("[{}] counting...", label),
            Poll::Ready(n) => {
                println!("[{}] reached {}", label, n);
                break;
            }
        }
    }

    println!();
    println!("Unpinned field (label) -> &mut String    (full access)");
    println!("Pinned field (inner)   -> Pin<&mut F>    (bouncer enforced)");
    println!("In practice, use #[pin_project] to generate this safely.");
}
