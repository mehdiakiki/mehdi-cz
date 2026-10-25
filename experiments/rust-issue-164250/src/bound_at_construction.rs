struct Q<T: 'static>(Option<T>);

fn main() {
    let l = String::from("local text");
    let q = Q(Some(&l));
}
