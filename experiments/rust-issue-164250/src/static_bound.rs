struct Q<T: 'static>(Option<T>);

impl<T: 'static> Drop for Q<T> {
    fn drop(&mut self) {
    }
}

fn main() {
    let l = String::new();
    let mut q = Q(None);
    q.0 = Some(&l);
}
