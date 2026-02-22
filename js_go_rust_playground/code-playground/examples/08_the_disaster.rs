// ============================================================
// Example 8: The Disaster
// ============================================================
// This code deliberately violates Pin's contract using unsafe.
// We create a pinned self-referential struct, then use
// get_unchecked_mut() to extract &mut T and swap the memory.
//
// In release mode, the optimizer may rearrange things so the
// corrupted pointer causes a segfault or garbage output.
// THIS IS UNDEFINED BEHAVIOR. Do not do this in real code.
//
// The point: Pin is not a magic wall. It is a contract.
// unsafe lets you break the contract, and the consequences
// are your responsibility.
// ============================================================

use std::marker::PhantomPinned;
use std::pin::Pin;
use std::ptr;

struct SelfRef {
    data: String,
    ptr: *const String,
    _pin: PhantomPinned,
}

impl SelfRef {
    fn new(text: &str) -> Pin<Box<Self>> {
        let mut boxed = Box::pin(SelfRef {
            data: String::from(text),
            ptr: ptr::null(),
            _pin: PhantomPinned,
        });
        let self_ptr = &boxed.data as *const String;
        unsafe {
            boxed.as_mut().get_unchecked_mut().ptr = self_ptr;
        }
        boxed
    }

    fn data_via_pointer(&self) -> &str {
        assert!(!self.ptr.is_null(), "pointer not initialized");
        unsafe { &*self.ptr }
    }
}

fn main() {
    let mut a = SelfRef::new("AAAA");
    let mut b = SelfRef::new("BBBB");

    println!("=== BEFORE the violation ===");
    println!("a.data         = {:?}", a.data);
    println!("a via pointer  = {:?}", a.data_via_pointer());
    println!("b.data         = {:?}", b.data);
    println!("b via pointer  = {:?}", b.data_via_pointer());
    println!("  (everything matches — pointers are correct)");
    println!();

    // ============================================================
    // THE VIOLATION: We bypass Pin using get_unchecked_mut()
    // and swap the two structs. This is unsound.
    // The internal pointers now point to the wrong memory.
    // ============================================================
    unsafe {
        let a_mut: &mut SelfRef = Pin::get_unchecked_mut(a.as_mut());
        let b_mut: &mut SelfRef = Pin::get_unchecked_mut(b.as_mut());
        std::mem::swap(a_mut, b_mut);
    }

    println!("=== AFTER the violation ===");
    println!("a.data         = {:?}", a.data);
    println!("a via pointer  = {:?}", a.data_via_pointer());
    println!("  ^ MISMATCH! The pointer followed the swap but still");
    println!("    points to the old Box allocation.");
    println!("b.data         = {:?}", b.data);
    println!("b via pointer  = {:?}", b.data_via_pointer());
    println!("  ^ Same problem. Both pointers are stale.");
    println!();
    println!("This is UNDEFINED BEHAVIOR.");
    println!("In release mode with real async state machines,");
    println!("this kind of corruption causes segfaults, garbage");
    println!("data, or silent memory corruption.");
    println!();
    println!("Pin is a contract. unsafe lets you break it.");
    println!("The consequences are always your responsibility.");
}
