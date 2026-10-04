struct Guard<'a> {
    data: &'a mut String,
}

impl Drop for Guard<'_> {
    fn drop(&mut self) {
        self.data.push_str(" closed");
    }
}

fn release<'a>(guard: Guard<'a>) -> &'a mut String {
    &mut *guard.data
}

fn main() {}
