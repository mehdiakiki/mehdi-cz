use std::alloc::{GlobalAlloc, Layout, System};
use std::mem::{align_of, size_of};
use std::ptr;

const MAGIC: usize = 0x5246_4130_3436;

#[derive(Clone, Copy)]
#[repr(C)]
struct Header {
    magic: usize,
    payload_size: usize,
}

#[unsafe(no_mangle)]
pub extern "C" fn rfa_allocate(payload_size: usize) -> *mut u8 {
    let Some(total_size) = size_of::<Header>().checked_add(payload_size) else {
        return ptr::null_mut();
    };
    let Ok(layout) = Layout::from_size_align(total_size, align_of::<Header>()) else {
        return ptr::null_mut();
    };

    let base = unsafe { System.alloc(layout) };
    if base.is_null() {
        return ptr::null_mut();
    }
    unsafe {
        base.cast::<Header>().write(Header {
            magic: MAGIC,
            payload_size,
        });
        base.add(size_of::<Header>())
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn rfa_deallocate(payload: *mut u8) -> i32 {
    if payload.is_null() {
        return 0;
    }

    let base = unsafe { payload.sub(size_of::<Header>()) };
    let header = unsafe { base.cast::<Header>().read() };
    if header.magic != MAGIC {
        return -1;
    }
    let Some(total_size) = size_of::<Header>().checked_add(header.payload_size) else {
        return -1;
    };
    let Ok(layout) = Layout::from_size_align(total_size, align_of::<Header>()) else {
        return -1;
    };
    unsafe { System.dealloc(base, layout) };
    0
}
