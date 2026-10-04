use std::rc::Rc;

fn main() {
    let mut owner = Rc::new(String::from("ready"));
    let observer = Rc::downgrade(&owner);
    assert!(Rc::get_mut(&mut owner).is_none());
    drop(observer);
    Rc::get_mut(&mut owner).unwrap().push_str(" now");
    assert_eq!(&*owner, "ready now");
}
