use std::rc::Rc;

fn main() {
    let mut owner = Rc::new(String::from("ready"));
    let observer = Rc::downgrade(&owner);
    assert!(Rc::get_mut(&mut owner).is_some(),
        "Rc::get_mut requires no other strong or weak pointers to the allocation");
    drop(observer);
}
