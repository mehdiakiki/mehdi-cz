// ============================================================
// Go Example 1: Goroutines — Runtime Concurrency
// ============================================================
// Go and Rust solve async differently:
//   Rust: compile-time state machines, zero-cost, Pin for safety
//   Go: runtime-managed goroutines, small stacks, garbage collected
//
// This example shows goroutines and channels — Go's primitives.
// There is no Pin in Go because goroutines do not create
// self-referential structs. The runtime manages memory instead.
// ============================================================

package main

import (
	"fmt"
	"sync"
)

func main() {
	fmt.Println("=== Goroutines: Lightweight Threads ===")
	fmt.Println()

	// A goroutine costs ~2KB of stack (vs ~8MB for an OS thread).
	// The Go runtime multiplexes thousands of goroutines onto a
	// small number of OS threads (M:N threading).

	var wg sync.WaitGroup

	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			fmt.Printf("  goroutine %d: hello from a lightweight thread\n", id)
		}(i) // Note: we pass `i` as a parameter to avoid the closure trap
	}

	wg.Wait()

	fmt.Println()
	fmt.Println("=== Channels: Communication Instead of Shared Memory ===")
	fmt.Println()

	// Go proverb: "Don't communicate by sharing memory;
	//              share memory by communicating."

	ch := make(chan string, 3)

	go func() { ch <- "message from goroutine A" }()
	go func() { ch <- "message from goroutine B" }()
	go func() { ch <- "message from goroutine C" }()

	for i := 0; i < 3; i++ {
		msg := <-ch
		fmt.Printf("  received: %s\n", msg)
	}

	fmt.Println()
	fmt.Println("=== The Tradeoff vs Rust ===")
	fmt.Println()
	fmt.Println("  Go: runtime manages goroutines, GC handles memory.")
	fmt.Println("       Easy to write, but: GC pauses, runtime overhead,")
	fmt.Println("       data races are possible (detected at runtime, not compile time).")
	fmt.Println()
	fmt.Println("  Rust: compiler transforms async fn into state machines.")
	fmt.Println("        Zero runtime cost, no GC, data races impossible.")
	fmt.Println("        But: you must understand Pin, lifetimes, and the borrow checker.")
}
