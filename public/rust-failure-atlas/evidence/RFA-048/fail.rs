use std::alloc::{GlobalAlloc, Layout, System};

struct AlwaysMove;

unsafe impl GlobalAlloc for AlwaysMove {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        unsafe { System.alloc(layout) }
    }

    unsafe fn dealloc(&self, pointer: *mut u8, layout: Layout) {
        unsafe { System.dealloc(pointer, layout) }
    }

    unsafe fn realloc(&self, pointer: *mut u8, old: Layout, new_size: usize) -> *mut u8 {
        let new_layout = Layout::from_size_align(new_size, old.align()).unwrap();
        let moved = unsafe { System.alloc(new_layout) };
        if moved.is_null() {
            return moved;
        }

        unsafe {
            std::ptr::copy_nonoverlapping(pointer, moved, old.size().min(new_size));
            System.dealloc(pointer, old);
        }
        moved
    }
}

#[global_allocator]
static ALLOCATOR: AlwaysMove = AlwaysMove;

fn main() {
    let mut values = Vec::with_capacity(1);
    values.push(10_u64);
    assert_eq!(values.capacity(), 1);
    let old_pointer = values.as_ptr() as usize;

    values.push(20);
    let current_pointer = values.as_ptr() as usize;

    // No stale pointer is dereferenced. The address comparison proves relocation.
    assert_eq!(
        old_pointer, current_pointer,
        "Vec growth relocated its allocation and invalidated the saved interior pointer"
    );
}
