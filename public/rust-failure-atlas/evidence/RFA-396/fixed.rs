use std::{cell::Cell, rc::Rc};

#[derive(Clone)]
struct Key { value: i32, calls: Rc<Cell<usize>> }

fn main() {
    let calls = Rc::new(Cell::new(0));
    let mut values = vec![
        Key { value: 3, calls: Rc::clone(&calls) },
        Key { value: 1, calls: Rc::clone(&calls) },
        Key { value: 2, calls: Rc::clone(&calls) },
    ];
    values.sort_by_cached_key(|item| {
        item.calls.set(item.calls.get() + 1);
        item.value
    });
    assert_eq!(calls.get(), 3);
    assert_eq!(values.iter().map(|item| item.value).collect::<Vec<_>>(), [1, 2, 3]);
}
