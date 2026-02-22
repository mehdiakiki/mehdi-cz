// ============================================================
// JS Example 4: Type Coercion — The Weird Parts, Explained
// ============================================================
// JavaScript's type coercion is not random. It follows a
// precise algorithm (the Abstract Equality Comparison).
// Once you see the rules, the "weird" results become
// predictable.
//
// This is the opposite of Rust, where the compiler refuses
// to compare different types without an explicit conversion.
// ============================================================

console.log("=== The Rules of == ===");
console.log("(these all follow the spec, they are NOT random)");
console.log("");

// Rule 1: null == undefined (and nothing else)
console.log("null == undefined:", null == undefined);     // true
console.log("null == 0:", null == 0);                     // false
console.log("null == '':", null == "");                    // false
console.log("null == false:", null == false);              // false
console.log("  → null only equals undefined with ==");

console.log("");

// Rule 2: When comparing number to string, convert string to number
console.log("1 == '1':", 1 == "1");                       // true (string→number)
console.log("0 == '':", 0 == "");                         // true ('' → 0)
console.log("0 == '0':", 0 == "0");                       // true ('0' → 0)

console.log("");

// Rule 3: When comparing boolean to anything, convert boolean to number first
console.log("true == 1:", true == 1);                     // true (true→1)
console.log("false == 0:", false == 0);                   // true (false→0)
console.log("true == '1':", true == "1");                 // true (true→1, then rule 2)
console.log("false == '':", false == "");                  // true (false→0, then rule 2)

console.log("");

// Rule 4: When comparing object to primitive, call .valueOf() then .toString()
console.log("[1] == 1:", [1] == 1);                       // true ([1].toString()→'1'→1)
console.log("[''] == 0:", [""] == 0);                     // true ([''].toString()→''→0)

console.log("");
console.log("=== The Famous Gotchas ===");
console.log("");

// These follow from the rules above:
console.log("'' == '0':", "" == "0");               // false (both strings, no coercion)
console.log("0 == '':", 0 == "");                   // true (rule 2: '' → 0)
console.log("0 == '0':", 0 == "0");                 // true (rule 2: '0' → 0)
console.log("  → '' != '0' but both == 0. Transitivity is broken.");

console.log("");
console.log("[] == false:", [] == false);            // true ([].toString()→''→0, false→0)
console.log("[] == ![]:", [] == ![]);                // true (![] is false, then same as above)
console.log("  → An array equals its own negation!");

console.log("");
console.log("=== The Fix: Always Use === ===");
console.log("");
console.log("1 === '1':", 1 === "1");               // false (different types, no coercion)
console.log("0 === '':", 0 === "");                  // false
console.log("null === undefined:", null === undefined); // false
console.log("  → === checks type AND value. No surprises.");
console.log("");
console.log("In Rust, there is no == between different types.");
console.log("The compiler refuses. That is the Rust philosophy.");
