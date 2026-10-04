trait Relates<'a, 'b> {}

fn accepts_every_pair<T>(_value: T)
where
    for<'a> &'a T: for<'b> Relates<'a, 'b>,
{
}

fn main() {}
