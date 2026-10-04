use std::marker::PhantomData;
use std::thread;

struct Handle<T> {
    id: usize,
    marker: PhantomData<*const T>,
}

fn inspect<T>(handle: Handle<T>) {
    println!("{}", handle.id);
}

fn main() {
    let handle = Handle::<u8> {
        id: 7,
        marker: PhantomData,
    };
    thread::spawn(move || inspect(handle)).join().unwrap();
}
