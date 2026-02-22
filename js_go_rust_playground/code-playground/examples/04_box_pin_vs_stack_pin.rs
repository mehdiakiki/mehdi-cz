// ============================================================
// Example 4: Box::pin vs Stack Pin
// ============================================================
// Two ways to pin a !Unpin type:
//   1. Box::pin()  — safe, heap-allocated
//   2. Pin::new_unchecked() — unsafe, stack-allocated
//
// Both provide the same guarantee (data will not move).
// The difference is who is responsible for that promise.
// ============================================================

use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};

// A simple future that yields once, then completes.
struct YieldOnce {
    yielded: bool,
}

impl Future for YieldOnce {
    type Output = &'static str;

    fn poll(mut self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<Self::Output> {
        if self.yielded {
            Poll::Ready("done!")
        } else {
            self.yielded = true;
            Poll::Pending
        }
    }
}

fn main() {
    // ==========================================
    // Door 1: Box::pin() — the safe, easy way
    // ==========================================
    // The heap allocation IS the pinning guarantee.
    // Box::pin() does not require unsafe.
    let boxed: Pin<Box<YieldOnce>> = Box::pin(YieldOnce { yielded: false });
    println!("Box::pin created — safe, no unsafe needed");
    println!("  Type: Pin<Box<YieldOnce>>");
    println!("  Data lives on the heap at a fixed address");
    println!("  The Box pointer can move freely; the data cannot");
    println!();

    // ==========================================
    // Door 2: Stack pinning — the hard way
    // ==========================================
    // YOU promise the compiler the data will not move.
    // This requires unsafe because the compiler cannot verify it.
    let mut stack_future = YieldOnce { yielded: false };

    // Safety: we will not move `stack_future` after this point.
    // In real code, use tokio::pin!() instead of writing this yourself.
    let stack_pinned: Pin<&mut YieldOnce> = unsafe {
        Pin::new_unchecked(&mut stack_future)
    };
    println!("Stack pin created — requires unsafe");
    println!("  Type: Pin<&mut YieldOnce>");
    println!("  Data lives on the stack");
    println!("  YOU guarantee it will not move");
    println!();

    // Both can be polled the same way — the Pin guarantee is identical.
    // The difference is only who provides the guarantee: heap vs programmer.
    drop(boxed);
    drop(stack_pinned);

    println!("Both doors lead to the same guarantee.");
    println!("Box::pin = the heap does it for you (safe).");
    println!("Stack pin = you do it yourself (unsafe).");
    println!("In practice, use Box::pin() or tokio::pin!() macro.");
}
