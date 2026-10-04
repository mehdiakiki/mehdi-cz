use std::cell::RefCell;

fn main() {
    let queue = RefCell::new(vec!["first"]);
    let mut first_borrow = queue.borrow_mut();
    first_borrow.push("second");

    let _second_borrow = queue.borrow_mut();
}
