trait Vehicle { type Color; }
trait Container { type Color; }
trait BoxCar: Vehicle + Container {}

fn inspect<C>(_: &dyn BoxCar<Color = C>) {}

fn main() {}
