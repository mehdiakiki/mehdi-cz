// ============================================================
// JS Example 2: Closures — The Loop Trap
// ============================================================
// Closures capture variables BY REFERENCE, not by value.
// This is one of the most common JavaScript bugs, and
// understanding it reveals how JS memory really works.
//
// In Rust, the borrow checker prevents this entire class of
// bugs at compile time. In JavaScript, you discover it at
// runtime when all your callbacks print "5" instead of 0-4.
// ============================================================

console.log("=== The Bug ===");

var functions = [];

// Using `var` — the variable `i` is function-scoped (shared).
for (var i = 0; i < 5; i++) {
    functions.push(function() {
        return i; // captures `i` by reference!
    });
}

// By the time we call these, the loop is done and i === 5.
for (var j = 0; j < functions.length; j++) {
    console.log("  functions[" + j + "]() = " + functions[j]());
    // All print 5! The closure captured a REFERENCE to `i`,
    // and `i` is now 5 after the loop finished.
}

console.log("");
console.log("=== The Fix (let) ===");

var fixedFunctions = [];

// Using `let` — the variable `i` is block-scoped (unique per iteration).
for (let i = 0; i < 5; i++) {
    fixedFunctions.push(function() {
        return i; // each iteration gets its OWN `i`
    });
}

for (var k = 0; k < fixedFunctions.length; k++) {
    console.log("  fixedFunctions[" + k + "]() = " + fixedFunctions[k]());
    // Prints 0, 1, 2, 3, 4 — each closure captured its own copy.
}

console.log("");
console.log("=== The Fix (IIFE) ===");

var iifeFunctions = [];

// Pre-ES6 fix: use an IIFE to create a new scope per iteration.
for (var i = 0; i < 5; i++) {
    (function(captured) {
        iifeFunctions.push(function() {
            return captured; // captures the PARAMETER, not the loop var
        });
    })(i);
}

for (var m = 0; m < iifeFunctions.length; m++) {
    console.log("  iifeFunctions[" + m + "]() = " + iifeFunctions[m]());
}

console.log("");
console.log("Lesson: closures capture references, not values.");
console.log("In Rust, the borrow checker makes this impossible.");
