import { NextRequest, NextResponse } from "next/server";

const EXAMPLES = [
  {
    id: "js_01_event_loop",
    title: "The Event Loop",
    section: "event-loop",
    description:
      "Microtasks, macrotasks, and the illusion of concurrency. Compare with Rust's state machines.",
    code: `// JavaScript is single-threaded — but Promises create the
// ILLUSION of concurrency through the microtask queue.
// Predict the output order BEFORE running.

console.log("1: synchronous — runs immediately");

Promise.resolve().then(() => {
    console.log("3: microtask — Promise.then() runs after sync code");
});

Promise.resolve().then(() => {
    console.log("4: second microtask");
    Promise.resolve().then(() => {
        console.log("5: nested microtask (still before macrotasks!)");
    });
});

console.log("2: still synchronous — sync always finishes first");`,
    editable_regions: [[8, 20]],
    mode: "interpret",
    expected_behavior: "success",
  },
  {
    id: "js_02_closures",
    title: "Closures & The Loop Trap",
    section: "closures",
    description:
      "Closures capture by reference, not value. The classic var/let bug Rust prevents at compile time.",
    code: `// The classic JavaScript loop trap.
// var is function-scoped; let is block-scoped.
// Which one captures the right value?

const funcs = [];

// BUG: var shares one binding across all iterations.
for (var i = 0; i < 3; i++) {
    funcs.push(() => console.log("var:", i)); // Always prints 3!
}

// FIX: let creates a new binding per iteration.
for (let j = 0; j < 3; j++) {
    funcs.push(() => console.log("let:", j)); // Prints 0, 1, 2
}

funcs.forEach(f => f());`,
    editable_regions: [[7, 15]],
    mode: "interpret",
    expected_behavior: "success",
  },
  {
    id: "rs_01_hello",
    title: "Hello, Rust",
    section: "basics",
    description: "A classic hello world to verify the Rust playground is wired up.",
    code: `fn main() {
    println!("Hello from Rust!");

    let numbers = vec![1, 2, 3, 4, 5];
    let sum: i32 = numbers.iter().sum();
    println!("Sum of {:?} = {}", numbers, sum);
}`,
    editable_regions: [[1, 6]],
    mode: "debug",
    expected_behavior: "success",
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get("lang");

  const langMap: Record<string, string[]> = {
    javascript: ["js_"],
    rust: ["rs_"],
    go: ["go_"],
  };

  const filtered = lang
    ? EXAMPLES.filter((e) =>
        (langMap[lang] ?? []).some((prefix) => e.id.startsWith(prefix))
      )
    : EXAMPLES;

  return NextResponse.json(filtered);
}
