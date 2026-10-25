use std::ffi::VaList;

pub unsafe extern "C" fn keep(args: ...) -> VaList<'static> {
    args
}
