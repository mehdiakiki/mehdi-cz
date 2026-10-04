fn larger<'a>(left: &'a i32, right: &i32) -> &'a i32 {
    if left > right { left } else { right }
}

fn main() {
    println!("{}", larger(&8, &5));
}
