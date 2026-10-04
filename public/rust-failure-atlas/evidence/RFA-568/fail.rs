fn accepts<F>(_callback: F)
where
    F: for<'a> Fn(u32) -> Option<&'a str>,
{
}

fn main() {}
