fn choose<'_>(left: &'_ str, right: &'_ str) -> &'_ str {
    if left.len() >= right.len() { left } else { right }
}

fn main() {}
