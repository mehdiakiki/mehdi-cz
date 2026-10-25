use std::ffi::{VaArgSafe, VaList};

pub unsafe fn read_one<T: VaArgSafe>(args: &mut VaList<'_>) -> T {
    unsafe { args.next_arg::<T>() }
}
