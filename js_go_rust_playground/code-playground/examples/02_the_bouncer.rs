// ============================================================
// Example 2: The Bouncer
// ============================================================
// Same self-referential struct, but now we use Pin.
// The dangerous swap line is included — it will NOT compile.
// The compiler error IS the lesson: Pin blocks &mut access
// for !Unpin types, making swap impossible.
//
// Try uncommenting the swap line to see the bouncer in action.
// ============================================================

use std::marker::PhantomPinned;
use std::pin::Pin;
use std::ptr;

struct SelfReferential {
    value: String,
    pointer_to_value: *const String,
    // This marker makes the struct !Unpin — it opts out of safe movement.
    _pin: PhantomPinned,
}

impl SelfReferential {
    fn new(text: &str) -> Self {
        SelfReferential {
            value: String::from(text),
            pointer_to_value: ptr::null(),
            _pin: PhantomPinned,
        }
    }

    // Initialize the self-reference after pinning.
    // This is the safe pattern: pin first, then set up internal pointers.
    fn init(self: Pin<&mut Self>) {
        let self_ptr = &self.value as *const String;
        // Safety: we are not moving the struct, only writing a pointer field.
        unsafe {
            self.get_unchecked_mut().pointer_to_value = self_ptr;
        }
    }

    fn get_value_via_pointer(self: Pin<&Self>) -> &str {
        unsafe { &*self.pointer_to_value }
    }
}

fn main() {
    // Pin using Box::pin — the safe, heap-based door.
    let mut a = Box::pin(SelfReferential::new("hello from A"));
    let mut b = Box::pin(SelfReferential::new("hello from B"));

    // Initialize the self-references now that the data is pinned.
    a.as_mut().init();
    b.as_mut().init();

    println!("a.value       = {:?}", a.value);
    println!("a via pointer = {:?}", a.as_ref().get_value_via_pointer());
    println!("b.value       = {:?}", b.value);
    println!("b via pointer = {:?}", b.as_ref().get_value_via_pointer());

    // -------------------------------------------------------
    // THE BOUNCER IN ACTION: Uncomment the line below.
    // It will NOT compile because Pin refuses to give you &mut T
    // for a !Unpin type, so std::mem::swap cannot work.
    // -------------------------------------------------------
    // std::mem::swap(&mut *a, &mut *b);  // ERROR: cannot borrow as mutable

    println!();
    println!("The swap line above does not compile.");
    println!("Pin's entire job is to prevent exactly that.");
}
