trait Relates<'a, 'b> {}

impl<'a, 'b> Relates<'a, 'b> for &'a String {}

fn accepts_every_pair<T>(_value: T)
where
    for<'a, 'b> &'a T: Relates<'a, 'b>,
{
}

fn main() {
    accepts_every_pair(String::from("payload"));
}
