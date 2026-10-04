#[cfg(unix)]
fn main() {
    use std::env;
    use std::ffi::{OsStr, OsString};
    use std::os::unix::ffi::{OsStrExt, OsStringExt};

    let key = "RFA_INVALID_UTF8_VALUE";
    let invalid = OsString::from_vec(vec![b'o', b'k', 0xff]);
    unsafe { env::set_var(key, &invalid) };

    let recovered = env::vars_os()
        .find(|(candidate, _)| candidate == OsStr::new(key))
        .map(|(_, value)| value)
        .unwrap();
    assert_eq!(recovered.as_os_str().as_bytes(), b"ok\xff");

    unsafe { env::remove_var(key) };
}

#[cfg(not(unix))]
compile_error!("RFA-366 is a Unix evidence fixture");
