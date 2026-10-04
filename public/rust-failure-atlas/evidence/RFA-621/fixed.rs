struct Node<T = ()> {
    next: Option<T>,
}

fn main() {
    let node: Node<()> = Node { next: None };
    assert!(node.next.is_none());
}
