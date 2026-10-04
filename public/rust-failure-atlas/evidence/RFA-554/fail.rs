struct Handler<'a> {
    callback: fn(&'a str),
}

trait Projection<'outer, 'inner> {
    type Output;
}

impl<'outer, 'inner> Projection<'outer, 'inner> for () {
    type Output = &'outer Handler<'inner>;
}

fn main() {}
