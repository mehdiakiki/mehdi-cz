mod storage {
    pub(in crate::storage) struct Handle;

    pub fn open() {
        let _ = Handle;
    }
}

fn main() {
    storage::open();
}
