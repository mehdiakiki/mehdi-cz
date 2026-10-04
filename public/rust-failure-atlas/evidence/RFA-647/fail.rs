trait DataAccess<T> {
    fn get_ref(&self) -> T;
}

struct Container<'a> {
    value: &'a f64,
}

impl<'a> DataAccess<&f64> for Container<'a> {
    fn get_ref(&self) -> &f64 {
        self.value
    }
}

fn main() {}
