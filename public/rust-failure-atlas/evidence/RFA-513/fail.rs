struct Resource;

impl Drop for &mut Resource {
    fn drop(&mut self) {}
}

fn main() {}
