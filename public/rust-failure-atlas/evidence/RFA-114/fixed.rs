use std::cell::RefCell;

fn main() {
    let queue = RefCell::new(vec!["first"]);
    {
        let mut first_borrow = queue.borrow_mut();
        first_borrow.push("second");
    }

    let mut second_borrow = queue.borrow_mut();
    second_borrow.push("third");
    assert_eq!(second_borrow.len(), 3);
}
