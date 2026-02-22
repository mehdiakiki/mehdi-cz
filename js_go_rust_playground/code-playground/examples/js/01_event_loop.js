// ============================================================
// JS Example 1: The Event Loop Illusion
// ============================================================
// JavaScript is single-threaded. There is no parallel execution.
// But Promises create the ILLUSION of concurrency through the
// microtask queue.
//
// Compare this with Rust's Pin article: Rust async is also
// single-threaded (per executor thread), but the compiler
// transforms your code into a state machine. JavaScript does
// something completely different — it uses a queue.
//
// Run this and predict the output order BEFORE looking.
// ============================================================

console.log("1: synchronous - runs immediately");

// This goes to the MICROTASK queue (high priority).
Promise.resolve().then(() => {
    console.log("4: microtask - Promise.then()");
});

// setTimeout would go to the MACROTASK queue (low priority),
// but Boa does not have setTimeout. In a browser:
// setTimeout(() => console.log("5: macrotask"), 0);
// would run AFTER all microtasks.

// Another microtask.
Promise.resolve().then(() => {
    console.log("5: second microtask");
    // Microtasks can schedule MORE microtasks.
    // They all run before any macrotask.
    Promise.resolve().then(() => {
        console.log("6: nested microtask (still before macrotasks!)");
    });
});

console.log("2: still synchronous");

console.log("3: synchronous code finishes first, THEN microtasks run");

// The output order reveals the event loop's priority system:
//   1. Run all synchronous code to completion
//   2. Drain the microtask queue (Promises)
//   3. Pick one macrotask (setTimeout, I/O callbacks)
//   4. Repeat
