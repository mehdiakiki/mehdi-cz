trait ReadFrom<'source>: 'source {}
trait WriteTo<'target>: 'target {}
trait Transfer<'source, 'target>: ReadFrom<'source> + WriteTo<'target> {}

struct Job<'source, 'target, 'object>
where
    'object: 'source + 'target,
{
    operation: Box<dyn Transfer<'source, 'target> + 'object>,
}

fn main() {}
