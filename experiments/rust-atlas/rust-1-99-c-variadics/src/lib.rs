//! C-variadic functions defined in Rust, callable from C and from Rust.

use std::ffi::{CStr, CString, VaList, c_char, c_double, c_int, c_long, c_uint};
use std::{ptr, slice};

unsafe extern "C" {
    fn vsnprintf(buf: *mut c_char, size: usize, fmt: *const c_char, args: VaList<'_>) -> c_int;
}

/// Adds the values.
pub fn sum(values: &[c_int]) -> c_long {
    values.iter().map(|&value| c_long::from(value)).sum()
}

/// Adds `count` arguments of C type `int`.
///
/// # Safety
///
/// The caller passes at least `count` more arguments, each of C type `int`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn rv_sum(count: c_int, args: ...) -> c_long {
    unsafe { rv_vsum(count, args) }
}

/// Adds the next `count` arguments of C type `int` from `args`.
///
/// # Safety
///
/// `args` has at least `count` more arguments, each of C type `int`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn rv_vsum(count: c_int, mut args: VaList<'_>) -> c_long {
    let mut values = Vec::new();
    for _ in 0..count {
        values.push(unsafe { args.next_arg::<c_int>() });
    }
    sum(&values)
}

/// Returns the mean of `count` arguments of C type `double`.
///
/// # Safety
///
/// `count` is positive, and the caller passes at least `count` more arguments,
/// each of C type `double`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn rv_mean(count: c_int, mut args: ...) -> c_double {
    let mut total = 0.0;
    for _ in 0..count {
        total += unsafe { args.next_arg::<c_double>() };
    }
    total / c_double::from(count)
}

/// Joins C strings with `/`, from `first` up to the first null pointer.
///
/// # Safety
///
/// `first` and every argument after it are valid C strings, and the list ends
/// with a null pointer. Free the result with `rv_free`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn rv_join_path(first: *const c_char, mut args: ...) -> *mut c_char {
    let mut out = Vec::new();
    let mut part = first;
    while !part.is_null() {
        if !out.is_empty() {
            out.push(b'/');
        }
        out.extend_from_slice(unsafe { CStr::from_ptr(part) }.to_bytes());
        part = unsafe { args.next_arg::<*const c_char>() };
    }
    into_c_string(out)
}

/// Formats `fmt` with the conversions `%d`, `%u`, `%f`, `%c`, `%s` and `%%`.
/// Any other conversion is copied to the result and reads no argument.
///
/// # Safety
///
/// `fmt` is a valid C string, and every conversion has one argument, in order:
/// `int` for `%d` and `%c`, `unsigned int` for `%u`, `double` for `%f`, and a
/// valid C string for `%s`. Free the result with `rv_free`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn rv_format(fmt: *const c_char, mut args: ...) -> *mut c_char {
    let mut out = Vec::new();
    let mut rest = unsafe { CStr::from_ptr(fmt) }.to_bytes().iter().copied();
    while let Some(byte) = rest.next() {
        if byte != b'%' {
            out.push(byte);
            continue;
        }
        match rest.next() {
            Some(b'd') => out.extend(unsafe { args.next_arg::<c_int>() }.to_string().bytes()),
            Some(b'u') => out.extend(unsafe { args.next_arg::<c_uint>() }.to_string().bytes()),
            Some(b'f') => {
                let value = unsafe { args.next_arg::<c_double>() };
                out.extend(format!("{value:.6}").bytes());
            }
            Some(b'c') => out.push(unsafe { args.next_arg::<c_int>() } as u8),
            Some(b's') => {
                let text = unsafe { CStr::from_ptr(args.next_arg::<*const c_char>()) };
                out.extend_from_slice(text.to_bytes());
            }
            Some(b'%') => out.push(b'%'),
            Some(other) => out.extend_from_slice(&[b'%', other]),
            None => out.push(b'%'),
        }
    }
    into_c_string(out)
}

/// Formats like C `printf` into a new string, with the C library `vsnprintf`.
///
/// # Safety
///
/// The contract of `printf`: `fmt` is a valid C string, and every argument
/// matches its conversion. Free the result with `rv_free`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn rv_cformat(fmt: *const c_char, args: ...) -> *mut c_char {
    let needed = unsafe { vsnprintf(ptr::null_mut(), 0, fmt, args.clone()) };
    let Ok(len) = usize::try_from(needed) else {
        return ptr::null_mut();
    };
    let mut buf = vec![0u8; len + 1];
    unsafe { vsnprintf(buf.as_mut_ptr().cast(), buf.len(), fmt, args) };
    buf.truncate(len);
    into_c_string(buf)
}

/// Adds `len` values of C type `int` that start at `values`.
///
/// # Safety
///
/// `len` is zero, or `values` points to `len` readable values of C type `int`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn rv_sum_array(values: *const c_int, len: usize) -> c_long {
    if len == 0 {
        return 0;
    }
    sum(unsafe { slice::from_raw_parts(values, len) })
}

/// Frees a string returned by `rv_join_path`, `rv_format` or `rv_cformat`.
///
/// # Safety
///
/// `text` is null, or a string from one of these functions that is not freed yet.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn rv_free(text: *mut c_char) {
    if !text.is_null() {
        drop(unsafe { CString::from_raw(text) });
    }
}

fn into_c_string(bytes: Vec<u8>) -> *mut c_char {
    CString::new(bytes).map_or(ptr::null_mut(), CString::into_raw)
}
