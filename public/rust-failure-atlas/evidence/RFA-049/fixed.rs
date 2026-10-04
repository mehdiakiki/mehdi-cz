struct Node {
    next: Option<Box<Node>>,
}

struct List {
    head: Option<Box<Node>>,
}

impl Drop for List {
    fn drop(&mut self) {
        let mut current = self.head.take();
        while let Some(mut node) = current {
            current = node.next.take();
        }
    }
}

fn main() {
    let worker = std::thread::Builder::new()
        .name("iterative-drop".to_owned())
        .stack_size(64 * 1024)
        .spawn(|| {
            let mut list = List { head: None };
            for _ in 0..50_000 {
                list.head = Some(Box::new(Node {
                    next: list.head.take(),
                }));
            }

            drop(list);
        })
        .unwrap();

    worker.join().unwrap();
}
