// Tests that pin what the article claims. Compile with `rustc --test` for a
// debug build and `rustc --test -O` for a release build; the same test file
// passes in both, because each test states what its build mode promises.
#[inline(never)]
fn bump(age: u8) -> u8 { age + 1 }

#[inline(never)]
fn bump_wide(age: u32) -> u32 { age + 1 }

#[test]
fn inside_the_type_both_builds_agree() {
    assert_eq!(bump(41), 42);
    assert_eq!(bump_wide(41), 42);
}

#[test]
fn the_wide_type_has_room_for_256() {
    assert_eq!(bump_wide(255), 256);
}

#[cfg(debug_assertions)]
#[test]
#[should_panic(expected = "attempt to add with overflow")]
fn debug_build_refuses_to_leave_the_type() {
    let _ = bump(std::hint::black_box(255));
}

#[cfg(not(debug_assertions))]
#[test]
fn release_build_wraps_around_to_zero() {
    assert_eq!(bump(std::hint::black_box(255)), 0);
}

#[test]
fn wrapping_add_makes_the_wrap_explicit_in_both_builds() {
    assert_eq!(255u8.wrapping_add(1), 0);
    assert_eq!(255u8.checked_add(1), None);
}
