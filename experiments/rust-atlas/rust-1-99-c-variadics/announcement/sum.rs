/// SAFETY: must be called with (at least) 2 i32 arguments.
unsafe extern "C" fn sum(mut args: ...) -> i32 {
    // SAFETY: guaranteed by the caller.
    let a = unsafe { args.next_arg::<i32>() };
    let b = unsafe { args.next_arg::<i32>() };
    a + b
}

fn foo() -> i32 {
    unsafe { sum(0i32, 2i32) }
}

fn main() {
    println!("foo() = {}", foo());
}
