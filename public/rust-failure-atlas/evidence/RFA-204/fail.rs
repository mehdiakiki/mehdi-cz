#[derive(Clone)]
struct Worker {
    id: u64,
}

fn main() {
    let mut workers = Vec::new();
    workers.resize(3, Worker { id: 7 });
    let ids = workers.iter().map(|worker| worker.id).collect::<Vec<_>>();

    assert_eq!(
        ids,
        [7, 8, 9],
        "Vec::resize clones one prototype instead of generating fresh values"
    );
}
