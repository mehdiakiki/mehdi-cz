// ============================================================
// Go Example 3: Error Handling — The Explicit Way
// ============================================================
// Go does not have exceptions. Go does not have Result<T, E>.
// Go returns errors as regular values and you check them manually.
//
// This is the most divisive design choice in Go.
//   Pro: no hidden control flow, every error is visible
//   Con: repetitive, easy to accidentally ignore
//
// Rust took a different path: Result<T, E> + the ? operator.
// Same philosophy (explicit errors), but with compiler enforcement.
// ============================================================

package main

import (
	"errors"
	"fmt"
	"strconv"
)

// In Go, functions that can fail return (value, error).
// This is a convention, not enforced by the compiler.
func divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, errors.New("division by zero")
	}
	return a / b, nil
}

// Custom error types — like Rust's custom Error enums.
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("validation error: %s — %s", e.Field, e.Message)
}

func parseAge(input string) (int, error) {
	age, err := strconv.Atoi(input)
	if err != nil {
		return 0, &ValidationError{
			Field:   "age",
			Message: fmt.Sprintf("'%s' is not a number", input),
		}
	}
	if age < 0 || age > 150 {
		return 0, &ValidationError{
			Field:   "age",
			Message: fmt.Sprintf("%d is out of range (0-150)", age),
		}
	}
	return age, nil
}

func main() {
	fmt.Println("=== Basic Error Handling ===")
	fmt.Println()

	// The canonical Go pattern: if err != nil { handle it }
	result, err := divide(10, 3)
	if err != nil {
		fmt.Println("  Error:", err)
	} else {
		fmt.Printf("  10 / 3 = %.2f\n", result)
	}

	result, err = divide(10, 0)
	if err != nil {
		fmt.Println("  10 / 0 = Error:", err)
	}

	fmt.Println()
	fmt.Println("=== The Repetition Problem ===")
	fmt.Println()

	// This is what real Go code looks like.
	// Notice how much of it is error checking.
	age1, err := parseAge("25")
	if err != nil {
		fmt.Println("  Error:", err)
		return
	}
	fmt.Printf("  Parsed age: %d\n", age1)

	age2, err := parseAge("abc")
	if err != nil {
		fmt.Println("  Error:", err)
	}
	_ = age2

	age3, err := parseAge("200")
	if err != nil {
		fmt.Println("  Error:", err)
	}
	_ = age3

	fmt.Println()
	fmt.Println("=== Error Type Checking (errors.As) ===")
	fmt.Println()

	// You can check the TYPE of an error — like Rust's match on Result.
	_, err = parseAge("xyz")
	var valErr *ValidationError
	if errors.As(err, &valErr) {
		fmt.Printf("  Caught ValidationError on field '%s': %s\n",
			valErr.Field, valErr.Message)
	}

	fmt.Println()
	fmt.Println("=== Comparison with Rust ===")
	fmt.Println()
	fmt.Println("  Go:   (value, error) tuple, manual if err != nil checks")
	fmt.Println("  Rust: Result<T, E> type, ? operator for propagation")
	fmt.Println()
	fmt.Println("  The Go way is explicit but repetitive.")
	fmt.Println("  The Rust way is explicit AND enforced by the compiler —")
	fmt.Println("  you CANNOT ignore a Result without the compiler warning you.")
	fmt.Println("  In Go, you CAN write: result, _ := divide(10, 0)")
	fmt.Println("  and the error silently disappears.")
}
