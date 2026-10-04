struct Node {
    next: Option<Box<Node>>,
}

fn main() {
    let worker = std::thread::Builder::new()
        .name("recursive-drop".to_owned())
        .stack_size(64 * 1024)
        .spawn(|| {
            let mut head = None;
            for _ in 0..50_000 {
                head = Some(Box::new(Node { next: head }));
            }

            // Generated drop glue follows one owned edge per stack frame.
            drop(head);
        })
        .unwrap();

    worker.join().unwrap();
}
