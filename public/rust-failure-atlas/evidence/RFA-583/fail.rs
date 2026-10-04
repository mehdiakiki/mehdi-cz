struct Queue {
    pending_count: usize,
}

impl Queue {
    fn pending(&self) -> usize {
        self.pending_count
    }
}

fn main() {
    let queue = Queue { pending_count: 4 };
    println!("{}", queue.pending);
}
