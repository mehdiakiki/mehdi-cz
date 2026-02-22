// ============================================================
// Example 7: Poll by Hand
// ============================================================
// A hand-written Future that simulates a multi-step operation.
// This is the call site that justifies Pin's existence:
//
//   fn poll(self: Pin<&mut Self>, cx: &mut Context) -> Poll<T>
//
// Notice: `self` is Pin<&mut Self>, not &mut self.
// The executor can advance the future but CANNOT move it.
// ============================================================

use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll, RawWaker, RawWakerVTable, Waker};

/// A future that simulates fetching data in stages:
///   Stage 0: "connecting..."
///   Stage 1: "downloading..."
///   Stage 2: "parsing..."
///   Stage 3: Ready("data: {42}")
///
/// Each call to poll() advances one stage.
struct FetchData {
    stage: u8,
}

impl FetchData {
    fn new() -> Self {
        FetchData { stage: 0 }
    }
}

impl Future for FetchData {
    type Output = String;

    // THIS is why Pin exists in everyday Rust.
    // The signature forces `self` through the bouncer.
    // An executor calling poll() cannot swap or move the future.
    fn poll(mut self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<Self::Output> {
        match self.stage {
            0 => {
                println!("  [poll] stage 0: connecting...");
                self.stage = 1;
                Poll::Pending
            }
            1 => {
                println!("  [poll] stage 1: downloading...");
                self.stage = 2;
                Poll::Pending
            }
            2 => {
                println!("  [poll] stage 2: parsing...");
                self.stage = 3;
                Poll::Pending
            }
            _ => {
                println!("  [poll] stage 3: complete!");
                Poll::Ready(format!("data: {{{}}}", 42))
            }
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
    // Pin the future on the heap.
    let mut future = Box::pin(FetchData::new());
    let waker = dummy_waker();
    let mut cx = Context::from_waker(&waker);

    println!("=== Manual Polling Loop ===");
    println!("This is what tokio/async-std do internally.");
    println!();

    let mut poll_count = 0;
    let result = loop {
        poll_count += 1;
        println!("--- poll #{} ---", poll_count);

        // .as_mut() reborrows so we can poll multiple times.
        match future.as_mut().poll(&mut cx) {
            Poll::Pending => {
                println!("  -> Pending (future is not done yet)");
                println!();
                // In a real executor, we would park the task here
                // and wake it when an I/O event fires.
            }
            Poll::Ready(data) => {
                println!("  -> Ready!");
                break data;
            }
        }
    };

    println!();
    println!("Final result: {}", result);
    println!("Polled {} times total.", poll_count);
    println!();
    println!("Key insight: every poll() call received Pin<&mut Self>.");
    println!("The executor advanced the future without ever getting &mut Self.");
    println!("That is Pin's entire purpose.");
}
