trait DataAccess<'a, T> {
    fn get_ref(&'a self) -> T;
}

struct Container<'a> {
    value: &'a f64,
}

impl<'a> DataAccess<'a, &'a f64> for Container<'a> {
    fn get_ref(&'a self) -> &'a f64 {
        self.value
    }
}

fn main() {
    let value = 1.5;
    let container = Container { value: &value };
    assert_eq!(*container.get_ref(), 1.5);
}
