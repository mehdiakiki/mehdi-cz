// SAFETY: the foreign host owns this unique global name and calls it with the
// declared C ABI. There are no pointer or ownership arguments in this fixture.
#[unsafe(no_mangle)]
pub extern "C" fn plugin_initialize() -> i32 {
    39
}
