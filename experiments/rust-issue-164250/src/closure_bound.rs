struct Q<T, F: FnMut(&T)>(Option<T>, F);

impl<T, F: FnMut(&T)> Drop for Q<T, F> {
    fn drop(&mut self) {
        self.1(self.0.as_ref().unwrap())
    }
}

fn main() {
    let mut out: Option<&'static _> = None;
    {
        let l = vec![vec![1]];
        let mut q = Q(None, |s| {
            out = Some(*s);
        });
        q.0 = Some(&l);
    }
    println!("{:?}", out);
}
