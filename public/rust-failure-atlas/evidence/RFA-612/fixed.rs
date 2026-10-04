struct Guard<'a> {
    data: &'a mut String,
}

impl Drop for Guard<'_> {
    fn drop(&mut self) {
        self.data.push_str(" closed");
    }
}

fn inspect<'a>(guard: &'a mut Guard<'a>) -> &'a mut String {
    &mut *guard.data
}

fn main() {}
