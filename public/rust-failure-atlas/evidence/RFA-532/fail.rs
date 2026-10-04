fn preserve<T>(token: &()) -> &() {
    preserve_with_bound::<T>(token)
}

fn preserve_with_bound<'a, T: 'a>(token: &'a ()) -> &'a () {
    token
}

fn main() {}
