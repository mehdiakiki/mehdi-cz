pub unsafe extern "C" fn first_byte(mut args: ...) -> u8 {
    unsafe { args.next_arg::<u8>() }
}
