// ============================================================
// Example 5: as_mut() Reborrow
// ============================================================
// Pin<&mut T> is NOT Copy (because &mut T is not Copy).
// If you pass it into a function, it is consumed — gone.
// .as_mut() reborrows the inner &mut T, giving you a fresh
// Pin<&mut T> with a shorter lifetime.
//
// This is the most common Pin mistake in real code.
// ============================================================

use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll, RawWaker, RawWakerVTable, Waker};

// A future that counts down from N to 0.
struct Countdown {
    remaining: u32,
}

impl Future for Countdown {
    type Output = String;

    fn poll(mut self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<Self::Output> {
        if self.remaining == 0 {
            Poll::Ready("liftoff!".to_string())
        } else {
            println!("  countdown: {}", self.remaining);
            self.remaining -= 1;
            Poll::Pending
        }
    }
}

// A dummy waker that does nothing (for demonstration only).
fn dummy_waker() -> Waker {
    fn no_op(_: *const ()) {}
    fn clone(p: *const ()) -> RawWaker { RawWaker::new(p, &VTABLE) }
    static VTABLE: RawWakerVTable = RawWakerVTable::new(clone, no_op, no_op, no_op);
    unsafe { Waker::from_raw(RawWaker::new(std::ptr::null(), &VTABLE)) }
}

fn main() {
    let mut future = Box::pin(Countdown { remaining: 3 });
    let waker = dummy_waker();
    let mut cx = Context::from_waker(&waker);

    println!("=== Polling with .as_mut() ===");
    println!();

    // WITHOUT as_mut(), the first poll() would consume `future`.
    // The second poll() would fail to compile:
    //
    //   future.poll(&mut cx);  // future is MOVED here
    //   future.poll(&mut cx);  // ERROR: use of moved value
    //
    // WITH as_mut(), each call gets a temporary reborrowed Pin:
    loop {
        match future.as_mut().poll(&mut cx) {
            Poll::Pending => {
                // future is still usable because as_mut() only gave
                // a temporary Pin, not the original.
                continue;
            }
            Poll::Ready(msg) => {
                println!();
                println!("Result: {}", msg);
                break;
            }
        }
    }

    println!();
    println!(".as_mut() = temporary guest pass from the bouncer.");
    println!("Your permanent badge stays in the drawer.");
}
