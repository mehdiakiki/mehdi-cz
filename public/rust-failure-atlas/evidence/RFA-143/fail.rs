use std::sync::{Arc, Weak};

struct Node {
    itself: Weak<Node>,
}

fn main() {
    let _node = Arc::new_cyclic(|weak| {
        assert!(
            weak.upgrade().is_some(),
            "Weak cannot upgrade before new_cyclic finishes"
        );
        Node {
            itself: weak.clone(),
        }
    });
}
