fn preserve<'a, T: 'a>(token: &'a ()) -> &'a () {
    preserve_with_bound::<T>(token)
}

fn preserve_with_bound<'a, T: 'a>(token: &'a ()) -> &'a () {
    token
}

fn main() {
    let token = ();
    assert_eq!(preserve::<String>(&token), &());
}
