use std::{
    cell::Cell,
    rc::Rc,
};

struct Tagged {
    id: usize,
    next_clone_id: Rc<Cell<usize>>,
}

impl Clone for Tagged {
    fn clone(&self) -> Self {
        let id = self.next_clone_id.get();
        self.next_clone_id.set(id + 1);
        Self {
            id,
            next_clone_id: Rc::clone(&self.next_clone_id),
        }
    }
}

fn main() {
    let tagged = Tagged {
        id: 0,
        next_clone_id: Rc::new(Cell::new(1)),
    };
    let ids: Vec<_> = std::iter::repeat_n(tagged, 3).map(|value| value.id).collect();

    assert_eq!(
        ids,
        vec![0, 1, 2],
        "repeat_n clones the value for the first n - 1 items and yields the original value last"
    );
}
