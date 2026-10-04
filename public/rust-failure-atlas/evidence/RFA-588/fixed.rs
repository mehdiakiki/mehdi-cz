fn larger<'a>(left: &'a i32, right: &'a i32) -> &'a i32 {
    if left > right { left } else { right }
}

fn main() {
    assert_eq!(*larger(&8, &5), 8);
}
