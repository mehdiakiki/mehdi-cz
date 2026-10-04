use std::marker::PhantomData;
use std::thread;

struct Handle<T> {
    id: usize,
    marker: PhantomData<T>,
}

fn main() {
    let handle = Handle::<u8> {
        id: 7,
        marker: PhantomData,
    };
    thread::spawn(move || assert_eq!(handle.id, 7)).join().unwrap();
}
