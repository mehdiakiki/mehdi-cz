struct PanicOnDrop;

impl Drop for PanicOnDrop {
    fn drop(&mut self) {
        panic!("destructor panic");
    }
}

fn main() {
    let _guard = PanicOnDrop;
    panic!("original panic");
}
