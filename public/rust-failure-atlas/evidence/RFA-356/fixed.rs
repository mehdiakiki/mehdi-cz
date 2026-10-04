use std::thread;

fn spawn_named(name: String) -> Result<String, &'static str> {
    if name.contains('\0') {
        return Err("thread names cannot contain NUL");
    }

    let handle = thread::Builder::new()
        .name(name)
        .spawn(|| thread::current().name().unwrap().to_owned())
        .map_err(|_| "the operating system rejected thread creation")?;

    handle.join().map_err(|_| "the worker panicked")
}

fn main() {
    assert_eq!(spawn_named("worker\0hidden".to_owned()), Err("thread names cannot contain NUL"));
    assert_eq!(spawn_named("worker-7".to_owned()), Ok("worker-7".to_owned()));
}
