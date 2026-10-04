struct Worker {
    id: u64,
}

fn main() {
    let mut workers = Vec::new();
    let mut next_id = 7;

    workers.resize_with(3, || {
        let worker = Worker { id: next_id };
        next_id += 1;
        worker
    });

    let ids = workers.iter().map(|worker| worker.id).collect::<Vec<_>>();
    assert_eq!(ids, [7, 8, 9]);
}
