pub unsafe extern "C" fn first_wide(mut args: ...) -> i128 {
    unsafe { args.next_arg::<i128>() }
}
