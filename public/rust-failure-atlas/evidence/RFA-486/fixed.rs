trait Vehicle { type Color; }
trait Container { type Color; }
trait BoxCar: Vehicle + Container {}

fn inspect<C, T>(_: &T)
where
    T: BoxCar + Vehicle<Color = C> + Container<Color = C>,
{}

fn main() {}
