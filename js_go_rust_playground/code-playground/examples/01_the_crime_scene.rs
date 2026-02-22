// ============================================================
// Example 1: The Crime Scene
// ============================================================
// A self-referential struct WITHOUT Pin protection.
// We build it, create an internal pointer, then use
// std::mem::swap to move the memory. The pointer goes stale.
// Run this and watch the corruption happen.
// ============================================================

use std::ptr;

struct SelfReferential {
    value: String,
    // This pointer will point to `value` above — inside the SAME struct.
    pointer_to_value: *const String,
}

impl SelfReferential {
    fn new(text: &str) -> Self {
        let mut sr = SelfReferential {
            value: String::from(text),
            pointer_to_value: ptr::null(),
        };
        sr.pointer_to_value = &sr.value as *const String;
        sr
    }

    // Dereference the raw pointer to see what it points to.
    // If the struct moved, this points at garbage.
    fn get_value_via_pointer(&self) -> &str {
        unsafe { &*self.pointer_to_value }
    }
}

fn main() {
    let mut a = SelfReferential::new("hello from A");
    let mut b = SelfReferential::new("hello from B");

    // Fix up the pointers after construction (they moved during let binding)
    a.pointer_to_value = &a.value as *const String;
    b.pointer_to_value = &b.value as *const String;

    println!("=== BEFORE swap ===");
    println!("a.value          = {:?}", a.value);
    println!("a via pointer    = {:?}", a.get_value_via_pointer());
    println!("b.value          = {:?}", b.value);
    println!("b via pointer    = {:?}", b.get_value_via_pointer());
    println!();

    // THE VILLAIN: std::mem::swap physically exchanges the bytes.
    // The internal pointers now point to each other's old locations!
    std::mem::swap(&mut a, &mut b);

    println!("=== AFTER swap ===");
    println!("a.value          = {:?}", a.value);
    println!("a via pointer    = {:?}", a.get_value_via_pointer());
    println!("  ^ These two should match, but the pointer is STALE!");
    println!("b.value          = {:?}", b.value);
    println!("b via pointer    = {:?}", b.get_value_via_pointer());
    println!("  ^ Same problem here. The pointers survived the swap,");
    println!("    but they still point to the OLD memory locations.");
}
