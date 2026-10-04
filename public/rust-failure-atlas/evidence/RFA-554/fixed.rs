struct Handler<'a> {
    callback: fn(&'a str),
}

trait Projection<'outer, 'inner> {
    type Output;
}

impl<'outer, 'inner: 'outer> Projection<'outer, 'inner> for () {
    type Output = &'outer Handler<'inner>;
}

fn print(value: &str) {
    println!("{value}");
}

fn main() {
    let handler = Handler { callback: print };
    (handler.callback)("ready");
}
