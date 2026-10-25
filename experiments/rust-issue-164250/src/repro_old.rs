use std::any::Any;
use std::cell::RefCell;
thread_local!(static KEPT: RefCell<Vec<Box<Any>>> = RefCell::new(Vec::new()));
struct Q<T: 'static>(Option<T>);
impl<T: 'static> Drop for Q<T> {
    fn drop(&mut self) { if let Some(t) = self.0.take() { KEPT.with(|k| k.borrow_mut().push(Box::new(t))); } }
}
fn main() {
    {
        let l = String::from("hello world, this is long enough");
        let mut q = Q(None);
        q.0 = Some(&l);
    }
    let _z = String::from("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
    KEPT.with(|k| println!("{}", k.borrow()[0].downcast_ref::<&'static String>().unwrap()));
}
