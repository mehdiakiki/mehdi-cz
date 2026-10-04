unsafe fn convert<T, U>(value: T) -> U {
    std::mem::transmute(value)
}

fn main() {}
