struct Resource;

struct Guard<'a> {
    resource: &'a mut Resource,
}

impl Drop for Guard<'_> {
    fn drop(&mut self) {
        let _ = &mut self.resource;
    }
}

fn main() {
    let mut resource = Resource;
    let _guard = Guard { resource: &mut resource };
}
