use std::cell::RefCell;
use std::ptr;

fn swap_distinct<T>(left: &RefCell<T>, right: &RefCell<T>) {
    if !ptr::eq(left, right) {
        left.swap(right);
    }
}

fn main() {
    let left = RefCell::new(String::from("left"));
    let right = RefCell::new(String::from("right"));

    swap_distinct(&left, &left);
    assert_eq!(&*left.borrow(), "left");

    swap_distinct(&left, &right);
    assert_eq!(&*left.borrow(), "right");
    assert_eq!(&*right.borrow(), "left");
}
