#[cfg(unix)]
fn main() {
    use std::env;
    use std::ffi::OsString;
    use std::os::unix::ffi::OsStringExt;
    use std::panic;

    let key = "RFA_INVALID_UTF8_VALUE";
    let invalid = OsString::from_vec(vec![b'o', b'k', 0xff]);
    unsafe { env::set_var(key, invalid) };

    let outcome = panic::catch_unwind(|| env::vars().collect::<Vec<_>>());
    unsafe { env::remove_var(key) };

    assert!(
        outcome.is_ok(),
        "env::vars panics while iterating over a non-Unicode key or value; vars_os preserves it"
    );
}

#[cfg(not(unix))]
compile_error!("RFA-366 is a Unix evidence fixture");
