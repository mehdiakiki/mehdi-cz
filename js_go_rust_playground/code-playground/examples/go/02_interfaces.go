// ============================================================
// Go Example 2: Interfaces — Implicit Satisfaction
// ============================================================
// Go interfaces are like Rust traits, but with one key difference:
//   Rust: you explicitly write `impl Trait for Type`
//   Go: if a type has the right methods, it satisfies the interface.
//       No declaration needed. This is called "structural typing."
//
// The tradeoff: Go is more flexible (no coupling to the interface
// definition), but Rust gives you compile-time guarantees that
// you intentionally implemented the trait.
// ============================================================

package main

import "fmt"

// An interface is just a method set.
type Speaker interface {
	Speak() string
}

type Stringer interface {
	String() string
}

// Dog satisfies Speaker because it has a Speak() method.
// We never write "Dog implements Speaker" — it is implicit.
type Dog struct {
	Name string
}

func (d Dog) Speak() string {
	return d.Name + " says woof!"
}

func (d Dog) String() string {
	return fmt.Sprintf("Dog{%s}", d.Name)
}

// Cat also satisfies Speaker.
type Cat struct {
	Name string
}

func (c Cat) Speak() string {
	return c.Name + " says meow!"
}

// Robot satisfies Speaker too — no inheritance needed.
type Robot struct {
	Model string
}

func (r Robot) Speak() string {
	return "I am " + r.Model + ". Beep boop."
}

// This function accepts ANY type that satisfies Speaker.
// In Rust, this would be: fn announce(s: &dyn Speaker) or fn announce(s: impl Speaker)
func announce(s Speaker) {
	fmt.Printf("  %T says: %s\n", s, s.Speak())
}

func main() {
	fmt.Println("=== Implicit Interface Satisfaction ===")
	fmt.Println()

	// All three types satisfy Speaker without declaring it.
	announce(Dog{Name: "Rex"})
	announce(Cat{Name: "Whiskers"})
	announce(Robot{Model: "T-800"})

	fmt.Println()
	fmt.Println("=== The Empty Interface: interface{} ===")
	fmt.Println()

	// interface{} (or `any` in Go 1.18+) has zero methods.
	// EVERY type satisfies it. This is Go's "dynamic typing escape hatch."
	// In Rust, the equivalent is `Box<dyn Any>`.
	var anything interface{}

	anything = 42
	fmt.Printf("  anything = %v (type: %T)\n", anything, anything)

	anything = "hello"
	fmt.Printf("  anything = %v (type: %T)\n", anything, anything)

	anything = Dog{Name: "Buddy"}
	fmt.Printf("  anything = %v (type: %T)\n", anything, anything)

	fmt.Println()
	fmt.Println("=== Type Assertion (Runtime Check) ===")
	fmt.Println()

	// To get the concrete type back, you use a type assertion.
	// This is a RUNTIME check — it can panic if wrong.
	// In Rust, this would be dyn Any::downcast_ref::<T>().
	if dog, ok := anything.(Dog); ok {
		fmt.Printf("  It is a dog: %s\n", dog.Speak())
	}

	if _, ok := anything.(Cat); !ok {
		fmt.Println("  It is NOT a cat (type assertion returned false)")
	}

	fmt.Println()
	fmt.Println("=== Comparison with Rust ===")
	fmt.Println()
	fmt.Println("  Go interfaces:   implicit, structural typing")
	fmt.Println("  Rust traits:     explicit `impl Trait for Type`")
	fmt.Println("  Go advantage:    decoupled, flexible, easy to compose")
	fmt.Println("  Rust advantage:  intentional, compiler-verified, no runtime surprises")
}
