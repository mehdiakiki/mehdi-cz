struct Q<T: 'static>(Option<T>);

fn main() {
    let l = String::from("local text");
    let mut q: Q<&String> = Q(None);
    q.0 = Some(&l);
}
