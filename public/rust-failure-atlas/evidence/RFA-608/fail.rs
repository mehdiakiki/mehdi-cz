use std::cell::Cell;

trait View<'a> {}

impl<'data, 'view> View<'view> for Cell<&'data u32> {}

fn expose<'data, 'view>(value: Cell<&'data u32>) -> impl View<'view>
where
    'data: 'view,
{
    value
}

fn main() {}
