use std::sync::{Arc, Weak};

struct Node {
    itself: Weak<Node>,
}

fn main() {
    let node = Arc::new_cyclic(|weak| {
        assert!(weak.upgrade().is_none());
        Node {
            itself: weak.clone(),
        }
    });

    let upgraded = node.itself.upgrade().unwrap();
    assert!(Arc::ptr_eq(&node, &upgraded));
}
